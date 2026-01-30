/**
 * 카드 결제 승인 API
 * 
 * 토스페이먼츠 결제창에서 successUrl로 리다이렉트 된 후
 * 결제를 최종 승인합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { confirmPayment } from '@/lib/tosspayments';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendOrderNotification } from '@/lib/sms';

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

    // orderId는 'CARD_123_timestamp' 형식이므로 실제 orderId 추출
    const actualOrderId = orderId.split('_')[1];

    const supabase = createServerSupabaseClient();

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
      console.error('[API] Order not found:', actualOrderId);
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
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

    // 토스페이먼츠 결제 승인
    const payment = await confirmPayment({
      paymentKey,
      orderId,
      amount,
    });

    if (!payment || payment.status !== 'DONE') {
      throw new Error('결제 승인에 실패했습니다.');
    }

    console.log(`[API] Payment confirmed for order ${actualOrderId}:`, {
      paymentKey,
      method: payment.method,
      status: payment.status,
    });

    // 주문 상태 업데이트
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
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
      .eq('id', actualOrderId);

    if (updateError) {
      console.error('[API] Order update error:', updateError);
      throw new Error('주문 정보 업데이트에 실패했습니다.');
    }

    // SMS 발송
    try {
      if (order.customer?.phone) {
        await sendOrderNotification({
          to: order.customer.phone,
          customerName: order.customer.name || '고객',
          orderNumber: actualOrderId,
          status: '결제 완료',
          deliveryDate: order.delivery_date,
          aptName: order.apt_name,
          totalAmount: order.total_amount,
        });
        
        console.log(`[API] SMS sent to ${order.customer.phone}`);
      }
    } catch (smsError) {
      // SMS 실패는 로그만 남기고 계속 진행
      console.error('[API] SMS error:', smsError);
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
