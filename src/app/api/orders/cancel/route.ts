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
import { sendSlackAlert, createCancellationNotification } from '@/lib/slack';

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

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'CANCELLED',
        cancel_reason: cancelReason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      await sendSlackAlert(slackMessage);
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
