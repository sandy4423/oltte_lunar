/**
 * 관리자 취소 요청 API
 * 
 * 관리자가 주문 취소를 요청하고, 환불 금액과 사유를 입력합니다.
 * 일회용 토큰을 생성하여 고객에게 계좌입력 링크를 SMS로 발송합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendSMS, createRefundAccountRequestSMS } from '@/lib/sms';
import { sendSlackMessage, createCancelRequestNotification } from '@/lib/slack';
import { verifyAdminAuth } from '@/lib/adminAuth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const authError = verifyAdminAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { orderId, refundAmount, refundReason } = body as {
      orderId: string;
      refundAmount: number;
      refundReason: string;
    };

    // 파라미터 검증
    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json(
        { error: '환불 금액이 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    if (!refundReason || refundReason.trim() === '') {
      return NextResponse.json(
        { error: '환불 사유가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. 주문 조회 및 검증 (order_items 포함)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        order_items (
          sku,
          qty
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[Cancel Request API] Order not found:', orderError);
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 환불 금액이 주문 금액을 초과하는지 확인
    if (refundAmount > order.total_amount) {
      return NextResponse.json(
        { error: `환불 금액이 주문 금액(${order.total_amount.toLocaleString()}원)을 초과할 수 없습니다.` },
        { status: 400 }
      );
    }

    // 이미 환불 처리된 주문인지 확인
    if (['CANCEL_REQUESTED', 'REFUND_PROCESSING', 'REFUNDED'].includes(order.status)) {
      return NextResponse.json(
        { error: '이미 취소/환불 처리 중이거나 완료된 주문입니다.' },
        { status: 400 }
      );
    }

    // 2. 일회용 토큰 생성 (UUID)
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

    // 3. refund_tokens 테이블에 저장
    const { error: tokenError } = await supabase
      .from('refund_tokens')
      .insert({
        order_id: orderId,
        token: token,
        refund_amount: refundAmount,
        refund_reason: refundReason,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('[Cancel Request API] Failed to create refund token:', tokenError);
      return NextResponse.json(
        { error: '토큰 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 4. 주문 상태를 CANCEL_REQUESTED로 변경
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'CANCEL_REQUESTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[Cancel Request API] Failed to update order status:', updateError);
      return NextResponse.json(
        { error: '주문 상태 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 5. 고객에게 SMS 발송 (계좌번호 입력 링크)
    const smsText = createRefundAccountRequestSMS({
      customerName: order.customer.name,
      refundAmount: refundAmount,
      token: token,
    });

    const smsResult = await sendSMS(order.customer.phone, smsText);
    if (!smsResult.success) {
      console.error('[Cancel Request API] SMS 발송 실패:', smsResult.error);
      // SMS 실패는 치명적이지 않으므로 계속 진행
    }

    // 6. Slack 알림 발송
    const slackMessage = createCancelRequestNotification({
      orderId: order.id,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      aptName: order.apt_name,
      dong: order.dong,
      ho: order.ho,
      totalAmount: order.total_amount,
      refundAmount: refundAmount,
      refundReason: refundReason,
      orderItems: order.order_items || [],
    });

    const slackResult = await sendSlackMessage(slackMessage);
    if (!slackResult.success) {
      console.error('[Cancel Request API] Slack 알림 실패:', slackResult.error);
      // Slack 실패는 치명적이지 않으므로 계속 진행
    }

    console.log(`[Cancel Request API] 취소 요청 완료: ${orderId}, 환불금액: ${refundAmount}원`);

    return NextResponse.json({
      success: true,
      message: '취소 요청이 처리되었습니다. 고객에게 계좌입력 링크를 발송했습니다.',
      token: token,
    });
  } catch (error: any) {
    console.error('[Cancel Request API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
