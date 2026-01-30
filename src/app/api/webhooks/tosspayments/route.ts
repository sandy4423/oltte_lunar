/**
 * 토스페이먼츠 웹훅 핸들러
 * 
 * DEPOSIT_CALLBACK 이벤트를 처리합니다.
 * - 가상계좌 입금 확인
 * - 주문 상태 업데이트 (PAID 또는 LATE_DEPOSIT)
 * - SMS 발송
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyWebhookSecret } from '@/lib/tosspayments';
import { sendOrderNotification } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Webhook] Toss Payments webhook received:', body);

    const { createdAt, secret, status, orderId, transactionKey } = body;

    // 필수 필드 확인
    if (!secret || !status || !orderId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // orderId는 'ORDER_123' 형식이므로 'ORDER_' 접두사 제거
    const actualOrderId = orderId.replace('ORDER_', '');

    // 주문 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers (
          phone,
          name
        )
      `)
      .eq('id', actualOrderId)
      .single();

    if (orderError || !order) {
      console.error('[Webhook] Order not found:', actualOrderId);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Secret 검증
    if (!verifyWebhookSecret(secret, order.toss_secret)) {
      console.error('[Webhook] Invalid secret');
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      );
    }

    // 입금 완료 처리
    if (status === 'DONE') {
      const now = new Date().toISOString();
      const cutoffAt = new Date(order.cutoff_at);
      const isPaid = new Date() <= cutoffAt;

      // 주문 상태 업데이트
      const newStatus = isPaid ? 'PAID' : 'LATE_DEPOSIT';
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          paid_at: now,
          updated_at: now,
        })
        .eq('id', actualOrderId);

      if (updateError) {
        console.error('[Webhook] Order update error:', updateError);
        throw new Error('Failed to update order status');
      }

      console.log(`[Webhook] Order ${actualOrderId} status updated to ${newStatus}`);

      // SMS 발송
      try {
        if (order.customer?.phone && !order.customer.phone.startsWith('guest_')) {
          await sendOrderNotification({
            to: order.customer.phone,
            customerName: order.customer.name || '고객',
            orderNumber: actualOrderId,
            status: newStatus === 'PAID' ? '입금 확인' : '마감 후 입금',
            deliveryDate: order.delivery_date,
            aptName: order.apt_name,
            totalAmount: order.total_amount,
          });
          
          console.log(`[Webhook] SMS sent to ${order.customer.phone}`);
        }
      } catch (smsError) {
        // SMS 실패는 로그만 남기고 계속 진행
        console.error('[Webhook] SMS error:', smsError);
      }

      return NextResponse.json({ success: true, status: newStatus });
    }

    // 취소된 경우
    if (status === 'CANCELED') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'CANCELED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualOrderId);

      if (updateError) {
        console.error('[Webhook] Order cancel update error:', updateError);
      }

      console.log(`[Webhook] Order ${actualOrderId} canceled`);
      return NextResponse.json({ success: true, status: 'CANCELED' });
    }

    // 기타 상태
    return NextResponse.json({ success: true, status });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}
