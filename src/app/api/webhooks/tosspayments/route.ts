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
import { verifyWebhookSecret, issueCashReceipt, getPayment } from '@/lib/tosspayments';
import { isManduOrder } from '@/lib/orderAccess.server';
import { sendSMSWithAlert } from '@/lib/smsAlert.server';
import { createPaymentConfirmSMS } from '@/lib/sms';
import { sendSlackMessage, createPaymentConfirmation, createErrorAlert } from '@/lib/slack';
import { formatKST } from '@/lib/utils';
import { ORDERING_OPEN } from '@/lib/ordering';

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    body = await request.json();
    // 2026-10-28 만두 주문 닫힘: 받기만 하고 주문은 바꾸지 않는다 (src/lib/ordering.ts).
    // body 는 로그·슬랙에 남기지 않는다 (secret 이 들어 있음).
    if (!ORDERING_OPEN) {
      await sendSlackMessage(createErrorAlert({
        errorType: '웹훅 - 만두 주문 닫힘 중 수신 (처리 안 함)',
        errorMessage: `status=${body?.status ?? '?'} — 실제 입금이면 토스 관리자에서 확인 필요`,
        orderId: String(body?.orderId ?? '').replace('ORDER_', ''),
        timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      })).catch(e => console.error('[Error Alert]', e));
      return NextResponse.json({ success: true, ignored: true });
    }
    // body 에는 secret 이 들어 있어 로그에 남기지 않는다 (2026-11-02)
    console.log('[Webhook] Toss Payments webhook received:', { status: body?.status, orderId: body?.orderId });

    const { createdAt, secret, status, orderId, transactionKey } = body;

    // 필수 필드 확인
    if (!secret || !status || !orderId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof orderId !== 'string' || !/^ORDER_\d+$/.test(orderId)) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    const supabase: any = createServerSupabaseClient();

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

    // 만두 주문만 (과일 주문은 다른 앱 몫)
    if (!isManduOrder(order)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Secret 검증
    if (!order.toss_secret || !verifyWebhookSecret(secret, order.toss_secret)) {
      console.error('[Webhook] Invalid secret');
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      );
    }

    // secret 만으로 결제 완료 처리하지 않는다 — 토스 서버에 직접 물어 확인 (R4)
    if (status === 'DONE' || status === 'CANCELED') {
      const verifyFail = async (reason: string) => {
        await sendSlackMessage(createErrorAlert({
          errorType: '웹훅 - 토스 결제 확인 불일치 (주문 변경 안 함)',
          errorMessage: reason,
          orderId: actualOrderId,
          timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        })).catch(e => console.error('[Error Alert]', e));
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
      };

      if (!order.toss_payment_key) {
        return verifyFail('주문에 결제 키가 없음');
      }
      let tossPayment: any;
      try {
        tossPayment = await getPayment(order.toss_payment_key);
      } catch (e) {
        return verifyFail(`토스 결제 조회 실패: ${e instanceof Error ? e.message : 'unknown'}`);
      }
      if (tossPayment?.orderId !== `ORDER_${order.id}`) {
        return verifyFail('토스 주문번호가 우리 주문과 다름');
      }
      if (status === 'DONE') {
        if (tossPayment?.status !== 'DONE') {
          return verifyFail(`토스 결제 상태가 DONE 이 아님 (${tossPayment?.status})`);
        }
        if (tossPayment?.totalAmount !== order.total_amount) {
          return verifyFail(`금액 불일치 (토스 ${tossPayment?.totalAmount} / 주문 ${order.total_amount})`);
        }
      } else if (!['CANCELED', 'PARTIAL_CANCELED', 'EXPIRED'].includes(tossPayment?.status)) {
        return verifyFail(`토스 결제 상태가 취소가 아님 (${tossPayment?.status})`);
      }
    }

    // 입금 완료 처리
    if (status === 'DONE') {
      // 이미 처리된 주문은 중복 처리 방지 (웹훅 재발송 대응)
      if (order.status === 'PAID' || order.status === 'LATE_DEPOSIT') {
        console.log(`[Webhook] Order ${actualOrderId} already paid (${order.status}), skipping duplicate webhook`);
        return NextResponse.json({ success: true, status: order.status, skipped: true });
      }

      // 취소·환불 중인 주문에 입금이 들어오면 「결제 완료」로 바꾸지 않는다 — 사장님이 환불 처리해야 함
      if (order.status !== 'WAITING_FOR_DEPOSIT' && order.status !== 'CREATED') {
        await sendSlackMessage(createErrorAlert({
          errorType: '취소된 주문에 입금됨 — 환불 필요',
          errorMessage: `주문 상태 ${order.status} 인데 토스에서 입금(DONE)이 확인됨. 주문은 바꾸지 않았음 — 입금자에게 환불해 주세요.`,
          orderId: actualOrderId,
          customerName: order.customer?.name,
          customerPhone: order.customer?.phone,
          timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        })).catch(e => console.error('[Error Alert]', e));
        return NextResponse.json({ success: true, status: order.status, ignored: true });
      }

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
        .eq('id', actualOrderId)
        .in('status', ['WAITING_FOR_DEPOSIT', 'CREATED']);

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

          console.log('[Webhook] Cash receipt issued successfully for order', actualOrderId);
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

      // SMS 발송 (고객) — 실패하면 슬랙으로 알린다
      if (order.customer?.phone) {
        const deliveryDateFormatted = formatKST(order.delivery_date, 'M월 d일 (EEE)');
        const pickupDateFormatted = order.pickup_date ? formatKST(order.pickup_date, 'M월 d일 (EEE)') : undefined;

        await sendSMSWithAlert(
          order.customer.phone,
          createPaymentConfirmSMS({
            customerName: order.customer.name || '고객',
            deliveryDate: deliveryDateFormatted,
            aptName: order.apt_name,
            dong: order.dong,
            ho: order.ho,
            isPickup: order.is_pickup,
            pickupDate: pickupDateFormatted,
            pickupTime: order.pickup_time || undefined,
          }),
          {
            errorType: '입금 확인 문자 실패',
            orderId: actualOrderId,
            customerName: order.customer.name,
            customerPhone: order.customer.phone,
            aptName: order.apt_name,
          }
        );
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
          paymentMethod: 'virtual_account',
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
          status: 'CANCELLED', // DB enum 값 (CANCELED 는 없어서 예전 코드는 갱신이 실패했음)
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualOrderId);

      if (updateError) {
        console.error('[Webhook] Order cancel update error:', updateError);
      }

      console.log(`[Webhook] Order ${actualOrderId} canceled`);
      return NextResponse.json({ success: true, status: 'CANCELLED' });
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
