/**
 * 주문 취소 API
 * POST /api/orders/cancel
 * 
 * Body: { orderId: string, cancelReason: string }
 * 전화번호는 번호 인증 쿠키에서만 가져온다 (body 의 phone 은 무시).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { cancelPayment } from '@/lib/tosspayments';
import { getSessionPhone, isManduOrder } from '@/lib/orderAccess.server';
import { sendSMS, createCancellationSMS } from '@/lib/sms';
import { sendSlackAlert, createCancellationNotification, sendSlackMessage, createErrorAlert } from '@/lib/slack';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, cancelReason } = body;

    const normalizedPhone = getSessionPhone(request);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: '전화번호 인증이 필요합니다.' },
        { status: 401 }
      );
    }

    if (!orderId || typeof cancelReason !== 'string' || !cancelReason.trim() || cancelReason.length > 200) {
      return NextResponse.json(
        { error: '주문번호와 취소 사유를 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase: any = createServerSupabaseClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order || !isManduOrder(order)) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const customer = order.customer as any;
    if (customer?.phone !== normalizedPhone) {
      return NextResponse.json(
        { error: '본인의 주문만 취소할 수 있습니다.' },
        { status: 403 }
      );
    }

    const cancellableStatuses = ['WAITING_FOR_DEPOSIT', 'PAID', 'CREATED'];
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: '취소할 수 없는 주문 상태입니다.' },
        { status: 400 }
      );
    }

    if (order.status === 'PAID' && order.cutoff_at) {
      const cutoffTime = new Date(order.cutoff_at);
      const now = new Date();
      if (now >= cutoffTime) {
        return NextResponse.json(
          { error: '마감 시간이 지나 취소할 수 없습니다. 고객센터로 문의해주세요.' },
          { status: 400 }
        );
      }
    }

    const wasPaid = order.status === 'PAID';
    const isVbankOrder =
      order.payment_method === 'vbank' || order.payment_method === 'virtual_account' || !!order.vbank_num;
    const nowIso = new Date().toISOString();

    // 가상계좌 입금 완료(PAID) 주문: 환불 계좌 없이 토스 취소를 부를 수 없다 → 취소 요청 상태로 두고 사장님께 알린다
    // (고객에게 문자는 자동으로 보내지 않는다. 사장님이 관리 화면의 취소 요청에서 환불 계좌 안내를 보낸다)
    if (wasPaid && isVbankOrder) {
      const { data: reqRows, error: reqError } = await supabase
        .from('orders')
        .update({ status: 'CANCEL_REQUESTED', cancel_reason: cancelReason, updated_at: nowIso })
        .eq('id', orderId)
        .eq('status', 'PAID')
        .select('id');
      if (reqError || !reqRows || reqRows.length !== 1) {
        return NextResponse.json(
          { error: '주문 상태 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }
      await sendSlackMessage(
        `:warning: *환불 계좌 받아야 함* — 가상계좌로 입금한 손님이 취소를 요청했어요.\n주문번호: ${orderId}\n고객: ${customer?.name || '고객'}\n금액: ${(order.total_amount || 0).toLocaleString()}원\n사유: ${cancelReason}\n→ 관리 화면의 취소 요청에서 환불 안내를 보내 주세요. (자동 문자는 보내지 않았습니다)`
      ).catch((e) => console.error('[Cancel] Slack failed:', e));
      return NextResponse.json({
        success: true,
        message: '취소 요청이 접수되었어요. 환불 계좌 안내를 따로 드릴게요.',
        wasPaid: true,
        refundPending: true,
      });
    }

    // 카드 결제 완료(PAID): 기존대로 토스 결제 취소
    if (wasPaid && order.toss_payment_key) {
      try {
        await cancelPayment(order.toss_payment_key, cancelReason);
      } catch (paymentError: any) {
        console.error('[Cancel] Payment cancellation failed:', paymentError);
        return NextResponse.json(
          { error: `결제 취소 실패: ${paymentError.message || '토스페이먼츠 오류'}` },
          { status: 500 }
        );
      }
    }

    // 입금 대기(가상계좌 발급됨): 토스의 가상계좌를 먼저 취소해야 취소 뒤에 입금이 들어오지 않는다. 실패하면 상태를 바꾸지 않는다.
    if (order.status === 'WAITING_FOR_DEPOSIT' && order.toss_payment_key) {
      try {
        await cancelPayment(order.toss_payment_key, cancelReason);
      } catch (paymentError: any) {
        const msg = paymentError instanceof Error ? paymentError.message : String(paymentError);
        console.error('[Cancel] Virtual account cancel failed:', msg);
        await sendSlackMessage(createErrorAlert({
          errorType: '손님 취소 — 가상계좌 취소 실패 (주문 상태 안 바꿈)',
          errorMessage: msg,
          orderId: String(orderId),
          timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        })).catch((e) => console.error('[Error Alert]', e));
        return NextResponse.json(
          { error: '가상계좌를 취소하지 못했어요. 잠시 후 다시 시도하거나 매장으로 문의해 주세요.' },
          { status: 409 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'CANCELLED',
        cancel_reason: cancelReason,
        cancelled_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[Cancel] Order update failed:', updateError);
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    try {
      const smsContent = createCancellationSMS({
        customerName: customer.name || '고객',
        orderId: `ORDER_${orderId}`,
        cancelReason,
        wasPaid,
      });
      await sendSMS(normalizedPhone, smsContent);
    } catch (smsError) {
      console.error('[Cancel] SMS failed:', smsError);
    }

    try {
      const slackMessage = createCancellationNotification({
        orderId: `ORDER_${orderId}`,
        customerName: customer.name || '고객',
        customerPhone: normalizedPhone,
        amount: order.total_amount || 0,
        cancelReason,
        wasPaid,
      });
      // createCancellationNotification 은 문자열을 돌려준다 (sendSlackAlert 는 {title, fields} 전용)
      await sendSlackMessage(slackMessage);
    } catch (slackError) {
      console.error('[Cancel] Slack failed:', slackError);
    }

    return NextResponse.json({
      success: true,
      message: '주문이 취소되었습니다.',
      wasPaid,
    });
  } catch (error: any) {
    console.error('[Cancel] Unexpected error:', error);
    return NextResponse.json(
      { error: '주문 취소 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
