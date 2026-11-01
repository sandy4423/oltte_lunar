/**
 * 가상계좌 발급 API
 * 
 * 서버에서 토스페이먼츠 V1 API를 사용하여 직접 가상계좌를 발급합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { issueVirtualAccount, getBankName } from '@/lib/tosspayments';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createVirtualAccountSMS } from '@/lib/sms';
import { sendSMSWithAlert } from '@/lib/smsAlert.server';
import { verifyOrderToken, isManduOrder } from '@/lib/orderAccess.server';
import { sendSlackMessage, createOrderNotification, createErrorAlert } from '@/lib/slack';
import { formatKST } from '@/lib/utils';

export async function POST(request: NextRequest) {
  // 오류 알림용 (본문은 한 번만 읽을 수 있어 미리 보관)
  let alertOrderId: string | undefined;
  try {
    const body = await request.json();
    // 금액·이름·전화는 받지 않는다 — 서버가 DB 에서 가져온다
    const { orderId, t, bank = '88' } = body;
    alertOrderId = orderId !== undefined ? String(orderId) : undefined;

    // 필수 파라미터 검증
    if (!orderId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 주문 열쇠 확인
    if (!verifyOrderToken(orderId, typeof t === 'string' ? t : null)) {
      return NextResponse.json(
        { error: '이 주문에 대한 권한이 없습니다.' },
        { status: 403 }
      );
    }

    if (typeof bank !== 'string' || !/^[0-9]{2,3}$/.test(bank)) {
      return NextResponse.json(
        { error: '은행 코드가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const supabase: any = createServerSupabaseClient(); // Database 제네릭이 never 로 추론되는 기존 문제 우회

    // 주문 정보 조회 (고객·order_items 포함)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, apt_code, status, total_amount, cutoff_at, delivery_date, apt_name, dong, ho, is_pickup, pickup_date, pickup_time,
        customer:customers (
          phone,
          name
        ),
        order_items (
          sku,
          qty
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order || !isManduOrder(order as any)) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 가상계좌는 처음 한 번만 (이미 발급·결제된 주문에 다시 발급 금지)
    if (order.status !== 'CREATED') {
      return NextResponse.json(
        { error: '가상계좌를 발급할 수 없는 주문 상태입니다.' },
        { status: 409 }
      );
    }

    const amount: number = order.total_amount;
    const customerName: string = (order.customer as any)?.name || '고객';
    const customerPhone: string = (order.customer as any)?.phone || '';

    // 입금 기한 계산
    const now = Date.now();
    const cutoffTime = new Date(order.cutoff_at).getTime();
    
    // 가상계좌 유효기간: 배송일 +5일 23:59로 통일
    // (주문 페이지 마감과 무관하게 입금은 여유롭게 가능하도록)
    const deliveryDate = new Date(order.delivery_date);
    deliveryDate.setDate(deliveryDate.getDate() + 5); // 배송일 +5일
    deliveryDate.setHours(23, 59, 59, 999); // 해당일 마지막 시각
    const paymentDeadline = deliveryDate.getTime();
    
    const validHours = Math.max(1, Math.floor((paymentDeadline - now) / (1000 * 60 * 60)));

    // 토스페이먼츠 가상계좌 발급
    const payment = await issueVirtualAccount({
      amount,
      orderId: `ORDER_${orderId}`,
      orderName: `올때만두 주문`,
      customerName,
      bank,
      validHours,
      ...(customerPhone && { customerMobilePhone: customerPhone }),
      cashReceipt: {
        type: '소득공제',
      },
    });

    if (!payment || !payment.virtualAccount) {
      throw new Error('가상계좌 발급에 실패했습니다.');
    }

    // 주문 정보 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        toss_payment_key: payment.paymentKey,
        toss_secret: payment.secret,
        status: 'WAITING_FOR_DEPOSIT',
        payment_method: 'vbank', // DB 에 쓰는 값: card / vbank / pos_card (화면이 가상계좌 안내를 보여 주는 기준)
        vbank_bank: getBankName(payment.virtualAccount.bankCode),
        vbank_num: payment.virtualAccount.accountNumber,
        vbank_expires_at: payment.virtualAccount.dueDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'CREATED');

    if (updateError) {
      console.error('[API] Order update error:', updateError);
      throw new Error('주문 정보 업데이트에 실패했습니다.');
    }

    console.log(`[API] Virtual account issued for order ${orderId} (bank ${payment.virtualAccount.bankCode})`);

    // SMS 발송 (고객) — 실패하면 슬랙으로 알린다
    if (customerPhone) {
      const dueDateFormatted = formatKST(payment.virtualAccount.dueDate, 'M월 d일 (EEE) HH:mm');
      const deliveryDateFormatted = formatKST(order.delivery_date, 'M월 d일 (EEE)');
      const pickupDateFormatted = order.pickup_date ? formatKST(order.pickup_date, 'M월 d일 (EEE)') : undefined;

      await sendSMSWithAlert(
        customerPhone,
        createVirtualAccountSMS({
          customerName,
          bankName: getBankName(payment.virtualAccount.bankCode),
          accountNumber: payment.virtualAccount.accountNumber,
          amount,
          dueDate: dueDateFormatted,
          deliveryDate: deliveryDateFormatted,
          aptName: order.apt_name,
          dong: order.dong,
          ho: order.ho,
          isPickup: order.is_pickup,
          pickupDate: pickupDateFormatted,
          pickupTime: order.pickup_time || undefined,
        }),
        {
          errorType: '가상계좌 안내 문자 실패',
          orderId,
          customerName,
          customerPhone,
          aptName: order.apt_name,
        }
      );
    }

    // Slack 알림 (관리자)
    try {
      const deliveryDateFormatted = formatKST(order.delivery_date, 'M월 d일 (EEE)');
      const pickupDateFormatted = order.pickup_date ? formatKST(order.pickup_date, 'M월 d일 (EEE)') : undefined;
      
      await sendSlackMessage(createOrderNotification({
        orderId: orderId.toString(),
        customerName,
        customerPhone: customerPhone || '미입력',
        aptName: order.apt_name,
        dong: order.dong,
        ho: order.ho,
        amount,
        deliveryDate: deliveryDateFormatted,
        isPickup: order.is_pickup,
        pickupDate: pickupDateFormatted,
        pickupTime: order.pickup_time || undefined,
        orderItems: order.order_items || [],
      }));
      
      console.log(`[API] Admin notification sent to Slack`);
    } catch (slackError) {
      // Slack 실패는 로그만 남기고 계속 진행
      console.error('[API] Slack error:', slackError);
    }

    // 응답 반환
    return NextResponse.json({
      success: true,
      paymentKey: payment.paymentKey,
      virtualAccount: {
        bankCode: payment.virtualAccount.bankCode,
        bankName: getBankName(payment.virtualAccount.bankCode),
        accountNumber: payment.virtualAccount.accountNumber,
        dueDate: payment.virtualAccount.dueDate,
        customerName: payment.virtualAccount.customerName,
      },
    });

  } catch (error: any) {
    console.error('[API] Virtual account error:', error);
    
    // Slack 에러 알림 (고객 입력값·비밀값 없이 주문번호만)
    try {
      await sendSlackMessage(createErrorAlert({
        errorType: '가상계좌 발급 오류',
        errorMessage: error.message || '가상계좌 발급 중 오류가 발생했습니다.',
        orderId: alertOrderId,
        timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      }));
    } catch (alertError) {
      console.error('[Error Alert]', alertError);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || '가상계좌 발급 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
