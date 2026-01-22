/**
 * PortOne V2 Webhook Handler
 * 
 * 트리거: payment.succeeded, payment.failed 등
 * 
 * PRD 6.2.2 입금 확정 (Webhook):
 * - PortOne V2 `payment.succeeded` 웹훅 수신
 * - 시그니처 검증 및 멱등성 체크 후 `status = PAID` 변경
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyWebhookSignature, verifyPaymentAmount } from '@/lib/portone';
import { sendSMS, createPaymentConfirmSMS } from '@/lib/sms';
import type { OrderStatus } from '@/types/database';

// ============================================
// Webhook Payload Types
// ============================================

interface PortOneWebhookPayload {
  type: string; // 'Transaction.Paid', 'Transaction.VirtualAccountIssued' 등
  timestamp: string;
  data: {
    paymentId: string;
    transactionId?: string;
    storeId: string;
    channelKey?: string;
  };
}

// ============================================
// POST /api/webhooks/portone
// ============================================

export async function POST(request: NextRequest) {
  console.log('[Webhook] PortOne webhook received');

  try {
    // 1. Raw body 추출 (시그니처 검증용)
    const rawBody = await request.text();
    
    // 2. 웹훅 시그니처 검증
    const webhookId = request.headers.get('webhook-id');
    const webhookTimestamp = request.headers.get('webhook-timestamp');
    const webhookSignature = request.headers.get('webhook-signature');

    const signatureResult = await verifyWebhookSignature(
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature
    );

    if (!signatureResult.valid) {
      console.error('[Webhook] Signature verification failed:', signatureResult.error);
      return NextResponse.json(
        { error: 'Invalid signature', detail: signatureResult.error },
        { status: 401 }
      );
    }

    // 3. Payload 파싱
    const payload: PortOneWebhookPayload = JSON.parse(rawBody);
    console.log('[Webhook] Event type:', payload.type);
    console.log('[Webhook] Payment ID:', payload.data.paymentId);

    // 4. 이벤트 타입 분기
    switch (payload.type) {
      case 'Transaction.Paid':
        return await handlePaymentSucceeded(payload);
      
      case 'Transaction.VirtualAccountIssued':
        // 가상계좌 발급 완료 - 별도 처리 불필요 (프론트에서 처리)
        console.log('[Webhook] Virtual account issued:', payload.data.paymentId);
        return NextResponse.json({ received: true });
      
      case 'Transaction.Failed':
        return await handlePaymentFailed(payload);
      
      case 'Transaction.Cancelled':
        // 결제 취소 - 로그만 기록
        console.log('[Webhook] Payment cancelled:', payload.data.paymentId);
        return NextResponse.json({ received: true });
      
      default:
        console.log('[Webhook] Unhandled event type:', payload.type);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// Event Handlers
// ============================================

/**
 * 결제 성공 처리 (입금 확인)
 */
async function handlePaymentSucceeded(payload: PortOneWebhookPayload) {
  const { paymentId } = payload.data;
  const supabase = createServerSupabaseClient();

  try {
    // 1. 주문 조회 (portone_payment_id로)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('portone_payment_id', paymentId)
      .single();

    if (orderError || !order) {
      console.error('[Webhook] Order not found for paymentId:', paymentId);
      // 주문을 찾을 수 없어도 200 반환 (웹훅 재시도 방지)
      return NextResponse.json({ 
        received: true, 
        warning: 'Order not found' 
      });
    }

    // 2. 멱등성 체크: 이미 PAID 상태라면 스킵
    if (order.status === 'PAID') {
      console.log('[Webhook] Order already paid, skipping:', order.id);
      return NextResponse.json({ 
        received: true, 
        message: 'Already processed' 
      });
    }

    // 3. 결제 금액 검증
    const verifyResult = await verifyPaymentAmount(paymentId, order.total_amount);
    
    if (!verifyResult.valid) {
      console.error('[Webhook] Payment verification failed:', verifyResult.error);
      // 금액 불일치는 심각한 문제 - 로그 남기고 수동 확인 필요
      // 하지만 웹훅은 200 반환해야 재시도 안 함
      return NextResponse.json({ 
        received: true, 
        warning: 'Amount verification failed',
        detail: verifyResult.error
      });
    }

    // 4. 마감 시간 체크 (마감 후 입금 시 LATE_DEPOSIT 처리)
    const now = new Date();
    const cutoffAt = new Date(order.cutoff_at);
    const newStatus: OrderStatus = now > cutoffAt ? 'LATE_DEPOSIT' : 'PAID';

    // 5. 주문 상태 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('[Webhook] Failed to update order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    console.log(`[Webhook] Order ${order.id} updated to ${newStatus}`);

    // 6. 입금 확인 SMS 발송
    if (order.customer) {
      const smsMessage = createPaymentConfirmSMS({
        customerName: order.customer.name,
        deliveryDate: order.delivery_date,
        aptName: order.apt_name,
      });

      const smsResult = await sendSMS(order.customer.phone, smsMessage);
      
      if (!smsResult.success) {
        console.error('[Webhook] SMS send failed:', smsResult.error);
        // SMS 실패해도 웹훅은 성공 처리
      }
    }

    return NextResponse.json({
      received: true,
      orderId: order.id,
      status: newStatus,
    });
  } catch (error) {
    console.error('[Webhook] handlePaymentSucceeded error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 결제 실패 처리
 */
async function handlePaymentFailed(payload: PortOneWebhookPayload) {
  const { paymentId } = payload.data;
  
  console.log('[Webhook] Payment failed:', paymentId);
  
  // 결제 실패는 별도 처리 없이 로그만 기록
  // 고객이 다시 시도할 수 있음
  
  return NextResponse.json({ received: true });
}
