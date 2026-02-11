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
import { verifyWebhookSecret, issueCashReceipt } from '@/lib/tosspayments';
import { sendSMS, createPaymentConfirmSMS } from '@/lib/sms';
import { sendSlackMessage, createPaymentConfirmation, createErrorAlert } from '@/lib/slack';
import { formatKST } from '@/lib/utils';

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    body = await request.json();
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

    // 주문 조회 (order_items 포함)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers (
          phone,
          name
        ),
        order_items (
          sku,
          qty
        )
      `)
      .eq('id', actualOrderId)
      .single();

    if (orderError || !order) {
      console.error('[Webhook] Order not found:', actualOrderId);
      
      // Slack 에러 알림
      await sendSlackMessage(createErrorAlert({
        errorType: '웹훅 - 주문 조회 실패',
        errorMessage: '주문을 찾을 수 없습니다',
        orderId: actualOrderId,
        timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      })).catch(e => console.error('[Error Alert]', e));
      
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
        
        // Slack 에러 알림
        await sendSlackMessage(createErrorAlert({
          errorType: '웹훅 - 주문 상태 업데이트 실패',
          errorMessage: updateError.message || '주문 상태 업데이트 실패',
          orderId: actualOrderId,
          customerName: order.customer?.name,
          customerPhone: order.customer?.phone,
          aptName: order.apt_name,
          timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        })).catch(e => console.error('[Error Alert]', e));
        
        throw new Error('Failed to update order status');
      }

      console.log(`[Webhook] Order ${actualOrderId} status updated to ${newStatus}`);

      // 현금영수증 자동 발급 (신청된 경우)
      if (order.cash_receipt_type && order.cash_receipt_number && !order.cash_receipt_issued) {
        try {
          console.log('[Webhook] Issuing cash receipt automatically');
          
          const cashReceiptData = await issueCashReceipt({
            orderId: order.id,
            amount: order.total_amount,
            orderName: `올때만두 - ${order.apt_name}`,
            customerName: order.customer?.name,
            type: order.cash_receipt_type as '소득공제' | '지출증빙',
            customerIdentityNumber: order.cash_receipt_number,
          });

          // 발급 성공 시 정보 저장
          await supabase
            .from('orders')
            .update({
              cash_receipt_issued: true,
              cash_receipt_url: cashReceiptData.receiptUrl,
              cash_receipt_key: cashReceiptData.receiptKey,
              updated_at: new Date().toISOString(),
            })
            .eq('id', actualOrderId);

          console.log('[Webhook] Cash receipt issued successfully:', cashReceiptData);
        } catch (cashReceiptError: any) {
          console.error('[Webhook] Cash receipt issue failed:', cashReceiptError);
          
          // Slack 알림
          await sendSlackMessage(createErrorAlert({
            errorType: '현금영수증 자동 발급 실패',
            errorMessage: cashReceiptError.message || '현금영수증 발급 실패',
            orderId: actualOrderId,
            customerName: order.customer?.name,
            customerPhone: order.customer?.phone,
            aptName: order.apt_name,
            timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          })).catch(e => console.error('[Slack Alert]', e));
        }
      }

      // SMS 발송 (고객)
      try {
        if (order.customer?.phone) {
          const deliveryDateFormatted = formatKST(order.delivery_date, 'M월 d일 (EEE)');
          const pickupDateFormatted = order.pickup_date ? formatKST(order.pickup_date, 'M월 d일 (EEE)') : undefined;
          
          await sendSMS(order.customer.phone, createPaymentConfirmSMS({
            customerName: order.customer.name || '고객',
            deliveryDate: deliveryDateFormatted,
            aptName: order.apt_name,
            dong: order.dong,
            ho: order.ho,
            isPickup: order.is_pickup,
            pickupDate: pickupDateFormatted,
            pickupTime: order.pickup_time || undefined,
          }));
          
          console.log(`[Webhook] SMS sent to ${order.customer.phone}`);
        }
      } catch (smsError) {
        // SMS 실패는 로그만 남기고 계속 진행
        console.error('[Webhook] SMS error:', smsError);
      }

      // Slack 알림 (관리자)
      try {
        const deliveryDateFormatted = formatKST(order.delivery_date, 'M월 d일 (EEE)');
        const pickupDateFormatted = order.pickup_date ? formatKST(order.pickup_date, 'M월 d일 (EEE)') : undefined;
        
        await sendSlackMessage(createPaymentConfirmation({
          orderId: actualOrderId,
          customerName: order.customer?.name || '고객',
          customerPhone: order.customer?.phone || '미입력',
          aptName: order.apt_name,
          dong: order.dong,
          ho: order.ho,
          amount: order.total_amount,
          deliveryDate: deliveryDateFormatted,
          isPickup: order.is_pickup,
          pickupDate: pickupDateFormatted,
          pickupTime: order.pickup_time || undefined,
          orderItems: order.order_items || [],
        }));
        
        console.log(`[Webhook] Admin payment notification sent to Slack`);
      } catch (slackError) {
        // Slack 실패는 로그만 남기고 계속 진행
        console.error('[Webhook] Slack error:', slackError);
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
    
    // Slack 에러 알림
    const orderId = body?.orderId ? body.orderId.replace('ORDER_', '') : undefined;
    await sendSlackMessage(createErrorAlert({
      errorType: '웹훅 처리 오류',
      errorMessage: error.message || 'Webhook processing failed',
      orderId: orderId,
      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    })).catch(e => console.error('[Error Alert]', e));
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}
