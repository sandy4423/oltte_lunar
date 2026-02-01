/**
 * 가상계좌 발급 API
 * 
 * 서버에서 토스페이먼츠 V1 API를 사용하여 직접 가상계좌를 발급합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { issueVirtualAccount, getBankName } from '@/lib/tosspayments';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendSMS, createVirtualAccountSMS, createAdminOrderNotificationSMS } from '@/lib/sms';
import { ADMIN_PHONE } from '@/lib/constants';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, amount, customerName, customerPhone, bank = '20' } = body;

    // 필수 파라미터 검증
    if (!orderId || !amount || !customerName) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, cutoff_at, delivery_date, apt_name, dong, ho')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 입금 기한 계산 (마감 시간까지)
    const now = Date.now();
    const cutoffTime = new Date(order.cutoff_at).getTime();
    const validHours = Math.max(1, Math.floor((cutoffTime - now) / (1000 * 60 * 60)));

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
        vbank_bank: getBankName(payment.virtualAccount.bankCode),
        vbank_num: payment.virtualAccount.accountNumber,
        vbank_expires_at: payment.virtualAccount.dueDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[API] Order update error:', updateError);
      throw new Error('주문 정보 업데이트에 실패했습니다.');
    }

    console.log(`[API] Virtual account issued for order ${orderId}:`, {
      paymentKey: payment.paymentKey,
      bank: payment.virtualAccount.bankCode,
      accountNumber: payment.virtualAccount.accountNumber,
    });

    // SMS 발송 (고객)
    if (customerPhone) {
      try {
        const dueDateFormatted = format(new Date(payment.virtualAccount.dueDate), 'M월 d일 (EEE) HH:mm', { locale: ko });
        const deliveryDateFormatted = format(new Date(order.delivery_date), 'M월 d일 (EEE)', { locale: ko });
        
        await sendSMS(customerPhone, createVirtualAccountSMS({
          customerName,
          bankName: getBankName(payment.virtualAccount.bankCode),
          accountNumber: payment.virtualAccount.accountNumber,
          amount,
          dueDate: dueDateFormatted,
          deliveryDate: deliveryDateFormatted,
          aptName: order.apt_name,
          dong: order.dong,
          ho: order.ho,
        }));
        
        console.log(`[API] SMS sent to ${customerPhone}`);
      } catch (smsError) {
        // SMS 실패는 로그만 남기고 계속 진행
        console.error('[API] SMS error:', smsError);
      }
    }

    // SMS 발송 (관리자 알림)
    try {
      const deliveryDateFormatted = format(new Date(order.delivery_date), 'M월 d일 (EEE)', { locale: ko });
      
      await sendSMS(ADMIN_PHONE, createAdminOrderNotificationSMS({
        orderId: orderId.toString(),
        customerName,
        customerPhone: customerPhone || '미입력',
        aptName: order.apt_name,
        dong: order.dong,
        ho: order.ho,
        amount,
        deliveryDate: deliveryDateFormatted,
      }));
      
      console.log(`[API] Admin notification SMS sent to ${ADMIN_PHONE}`);
    } catch (smsError) {
      // SMS 실패는 로그만 남기고 계속 진행
      console.error('[API] Admin SMS error:', smsError);
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
    return NextResponse.json(
      {
        success: false,
        error: error.message || '가상계좌 발급 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
