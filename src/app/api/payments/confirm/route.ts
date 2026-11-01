/**
 * 카드 결제 승인 API
 * 
 * 토스페이먼츠 결제창에서 successUrl로 리다이렉트 된 후
 * 결제를 최종 승인합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { confirmPayment, cancelPayment } from '@/lib/tosspayments';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createPaymentConfirmSMS } from '@/lib/sms';
import { sendSMSWithAlert } from '@/lib/smsAlert.server';
import { isManduOrder } from '@/lib/orderAccess.server';
import { sendSlackMessage, createPaymentConfirmation, createErrorAlert } from '@/lib/slack';
import { formatKST } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentKey, orderId, amount } = body;

    // 필수 파라미터 검증
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // orderId는 'CARD_123_timestamp' 형식 — 숫자 주문번호만 허용
    const idMatch = typeof orderId === 'string' ? /^CARD_(\d+)_\d+$/.exec(orderId) : null;
    if (!idMatch || typeof amount !== 'number' || !Number.isInteger(amount)) {
      return NextResponse.json(
        { error: '주문 정보가 올바르지 않습니다.' },
        { status: 400 }
      );
    }
    const actualOrderId = idMatch[1];

    const supabase: any = createServerSupabaseClient(); // Database 제네릭이 never 로 추론되는 기존 문제 우회

    // 주문 조회
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
      console.error('[API] Order not found:', actualOrderId);
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 만두 주문만 (과일 주문은 다른 앱 몫)
    if (!isManduOrder(order as any)) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 결제 완료면 다시 승인하지 않고 성공으로 돌려준다 (새로고침·중복 호출 대응, 문자 재발송 없음)
    if (order.status === 'PAID') {
      return NextResponse.json({
        success: true,
        orderId: actualOrderId,
        status: 'PAID',
        alreadyPaid: true,
      });
    }
    if (order.status !== 'CREATED' && order.status !== 'WAITING_FOR_DEPOSIT') {
      return NextResponse.json(
        { error: '결제할 수 없는 주문 상태입니다.' },
        { status: 409 }
      );
    }

    // 금액 검증
    if (order.total_amount !== amount) {
      console.error('[API] Amount mismatch:', {
        expected: order.total_amount,
        received: amount,
      });
      return NextResponse.json(
        { error: '결제 금액이 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    const alert = (errorType: string, errorMessage: string) =>
      sendSlackMessage(createErrorAlert({
        errorType,
        errorMessage,
        orderId: actualOrderId,
        timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      })).catch(e => console.error('[Error Alert]', e));

    // 가상계좌를 이미 발급받은 주문이 카드로 바꿔 결제하면, 카드를 승인하기 전에 가상계좌를 먼저 취소한다
    // (안 그러면 같은 주문에 카드와 입금이 둘 다 들어올 수 있다). 입금 전 가상계좌 취소는 환불 계좌가 필요 없다.
    let vbankCancelled = false;
    if (order.status === 'WAITING_FOR_DEPOSIT' && order.toss_payment_key && order.toss_payment_key !== paymentKey) {
      try {
        await cancelPayment(order.toss_payment_key, '카드 결제로 전환 (가상계좌 취소)');
        vbankCancelled = true;
      } catch (cancelErr) {
        const msg = cancelErr instanceof Error ? cancelErr.message : String(cancelErr);
        console.error('[API] Virtual account cancel failed:', msg);
        await alert('카드 결제 전환 — 가상계좌 취소 실패 (카드 승인 안 함)', msg);
        return NextResponse.json(
          { error: '기존 가상계좌를 정리하지 못해 카드 결제를 진행할 수 없어요. 잠시 후 다시 시도하거나 매장으로 문의해 주세요.' },
          { status: 409 }
        );
      }
    }

    // 토스페이먼츠 결제 승인
    let payment: any;
    try {
      payment = await confirmPayment({
        paymentKey,
        orderId,
        amount,
      });
      if (!payment || payment.status !== 'DONE') {
        throw new Error('결제 승인에 실패했습니다.');
      }
    } catch (confirmErr) {
      if (vbankCancelled) {
        // 가상계좌는 이미 취소됐으니 주문을 처음 상태로 돌려 다시 결제 방법을 고를 수 있게 한다
        await supabase
          .from('orders')
          .update({
            status: 'CREATED',
            vbank_bank: null,
            vbank_num: null,
            vbank_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', actualOrderId)
          .eq('status', 'WAITING_FOR_DEPOSIT');
        await alert('카드 승인 실패 — 가상계좌는 이미 취소됨 (주문을 CREATED 로 되돌림)', confirmErr instanceof Error ? confirmErr.message : String(confirmErr));
      }
      throw confirmErr;
    }

    console.log(`[API] Payment confirmed for order ${actualOrderId}:`, {
      paymentKey,
      method: payment.method,
      status: payment.status,
    });

    // 주문 상태 업데이트
    const now = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await supabase
      .from('orders')
      .update({
        toss_payment_key: paymentKey,
        status: 'PAID',
        payment_method: 'card',
        paid_at: now,
        updated_at: now,
        // 가상계좌 정보 제거 (카드로 결제했으므로)
        vbank_bank: null,
        vbank_num: null,
        vbank_expires_at: null,
      })
      .eq('id', actualOrderId)
      .in('status', ['CREATED', 'WAITING_FOR_DEPOSIT'])
      .select('id');

    if (updateError) {
      console.error('[API] Order update error:', updateError);
      throw new Error('주문 정보 업데이트에 실패했습니다.');
    }

    // 그 사이 주문 상태가 바뀌어(취소 등) 갱신된 줄이 없으면: 방금 승인한 카드 결제를 되돌리고 문자는 보내지 않는다
    if (!updatedRows || updatedRows.length !== 1) {
      let cancelMsg = '카드 결제 자동 취소 완료';
      try {
        await cancelPayment(paymentKey, '주문 상태 변경으로 자동 취소');
      } catch (cancelErr) {
        cancelMsg = `카드 결제 자동 취소 실패 — 토스에서 직접 확인 필요: ${cancelErr instanceof Error ? cancelErr.message : String(cancelErr)}`;
      }
      await alert('카드 승인 직후 주문 상태가 바뀌어 있음 (PAID 갱신 0건)', cancelMsg);
      return NextResponse.json(
        { error: '주문 상태가 바뀌어 결제를 완료하지 못했어요. 카드 결제는 자동으로 취소됩니다.' },
        { status: 409 }
      );
    }

    // SMS 발송 (고객) — 실패하면 슬랙으로 알린다
    if (order.customer?.phone) {
      const deliveryDateFormatted = formatKST(order.delivery_date, 'M월 d일 (EEE)');
      const pickupDateForSms = order.pickup_date ? formatKST(order.pickup_date, 'M월 d일 (EEE)') : undefined;
      await sendSMSWithAlert(
        order.customer.phone,
        createPaymentConfirmSMS({
          customerName: order.customer.name || '고객',
          deliveryDate: deliveryDateFormatted,
          aptName: order.apt_name,
          dong: order.dong,
          ho: order.ho,
          isPickup: order.is_pickup,
          pickupDate: pickupDateForSms,
          pickupTime: order.pickup_time || undefined,
        }),
        {
          errorType: '결제 완료 문자 실패',
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
        paymentMethod: 'card',
      }));
      
      console.log(`[API] Admin payment notification sent to Slack`);
    } catch (slackError) {
      // Slack 실패는 로그만 남기고 계속 진행
      console.error('[API] Slack error:', slackError);
    }

    return NextResponse.json({
      success: true,
      orderId: actualOrderId,
      status: 'PAID',
      paymentKey,
    });

  } catch (error: any) {
    console.error('[API] Payment confirmation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '결제 승인 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
