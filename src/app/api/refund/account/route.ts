/**
 * 환불 계좌번호 입력 및 자동 환불 처리 API
 * 
 * GET: 토큰으로 주문 및 환불 정보 조회
 * POST: 계좌정보 저장 및 토스페이먼츠 환불 자동 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cancelPayment, getBankName } from '@/lib/tosspayments';
import { sendSMS, createRefundCompleteSMS } from '@/lib/sms';
import { sendSlackMessage, createRefundCompleteNotification, createErrorAlert } from '@/lib/slack';
import type { Database } from '@/types/database';

// 클라이언트용 Supabase (RLS 적용)
function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// 서버용 Supabase (RLS 우회, 환불 처리용)
function createServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

// ============================================
// GET: 토큰 검증 및 주문 정보 조회
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: '토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createPublicSupabaseClient();

    // 토큰으로 환불 정보 조회
    const { data: refundToken, error: tokenError } = await supabase
      .from('refund_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !refundToken) {
      return NextResponse.json(
        { error: '유효하지 않은 링크입니다.' },
        { status: 404 }
      );
    }

    // 토큰 만료 확인
    const now = new Date();
    const expiresAt = new Date(refundToken.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: '만료된 링크입니다. 고객센터(010-2592-4423)로 문의해주세요.' },
        { status: 410 }
      );
    }

    // 이미 사용된 토큰 확인
    if (refundToken.used) {
      return NextResponse.json(
        { error: '이미 처리된 요청입니다.' },
        { status: 410 }
      );
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        apt_name,
        dong,
        ho,
        total_amount,
        status,
        customer:customers(name, phone)
      `)
      .eq('id', refundToken.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        customerName: order.customer.name,
        aptName: order.apt_name,
        dong: order.dong,
        ho: order.ho,
        totalAmount: order.total_amount,
        refundAmount: refundToken.refund_amount,
        refundReason: refundToken.refund_reason,
      },
    });
  } catch (error: any) {
    console.error('[Refund Account API] GET error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: 계좌정보 저장 및 자동 환불 처리
// ============================================

export async function POST(request: NextRequest) {
  const supabase = createServiceSupabaseClient();
  let orderId: string | undefined;
  let orderData: any;

  try {
    const body = await request.json();
    const { token, bank_code, account_number, account_holder } = body as {
      token: string;
      bank_code: string;
      account_number: string;
      account_holder: string;
    };

    // 파라미터 검증
    if (!token || !bank_code || !account_number || !account_holder) {
      return NextResponse.json(
        { error: '모든 정보를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 계좌번호 형식 검증 (숫자만)
    if (!/^[0-9]+$/.test(account_number)) {
      return NextResponse.json(
        { error: '계좌번호는 숫자만 입력 가능합니다.' },
        { status: 400 }
      );
    }

    // 1. 토큰 조회 및 검증
    const { data: refundToken, error: tokenError } = await supabase
      .from('refund_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !refundToken) {
      return NextResponse.json(
        { error: '유효하지 않은 링크입니다.' },
        { status: 404 }
      );
    }

    // 토큰 만료 확인
    const now = new Date();
    const expiresAt = new Date(refundToken.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: '만료된 링크입니다. 고객센터(010-2592-4423)로 문의해주세요.' },
        { status: 410 }
      );
    }

    // 이미 사용된 토큰 확인
    if (refundToken.used) {
      return NextResponse.json(
        { error: '이미 처리된 요청입니다.' },
        { status: 410 }
      );
    }

    orderId = refundToken.order_id;

    // 2. 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    orderData = order;

    // 주문 상태 확인
    if (order.status !== 'CANCEL_REQUESTED') {
      return NextResponse.json(
        { error: '취소 요청 상태가 아닙니다.' },
        { status: 400 }
      );
    }

    // 3. 계좌정보 저장
    const { error: updateTokenError } = await supabase
      .from('refund_tokens')
      .update({
        bank_code: bank_code,
        account_number: account_number,
        account_holder: account_holder,
      })
      .eq('id', refundToken.id);

    if (updateTokenError) {
      console.error('[Refund Account API] 계좌정보 저장 실패:', updateTokenError);
      return NextResponse.json(
        { error: '계좌정보 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 4. 주문 상태를 REFUND_PROCESSING으로 변경
    const { error: statusError } = await supabase
      .from('orders')
      .update({
        status: 'REFUND_PROCESSING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (statusError) {
      console.error('[Refund Account API] 상태 변경 실패:', statusError);
      return NextResponse.json(
        { error: '주문 상태 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 5. 토스페이먼츠 환불 API 호출
    if (!order.toss_payment_key) {
      throw new Error('결제 키가 없습니다.');
    }

    try {
      await cancelPayment(
        order.toss_payment_key,
        refundToken.refund_reason,
        refundToken.refund_amount,
        {
          bank: bank_code,  // 은행 코드 전달 (예: "20")
          accountNumber: account_number,
          holderName: account_holder,
        }
      );
    } catch (tossError: any) {
      console.error('[Refund Account API] 토스페이먼츠 환불 실패:', tossError);

      // 환불 실패 시 상태 롤백
      await supabase
        .from('orders')
        .update({
          status: 'CANCEL_REQUESTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Slack 에러 알림
      await sendSlackMessage(createErrorAlert({
        errorType: '환불 처리 실패',
        errorMessage: tossError.message || '토스페이먼츠 환불 API 호출 실패',
        orderId: orderId,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        aptName: order.apt_name,
        timestamp: new Date().toISOString(),
      }));

      return NextResponse.json(
        { error: '환불 처리에 실패했습니다. 고객센터(010-2592-4423)로 문의해주세요.' },
        { status: 500 }
      );
    }

    // 6. 환불 성공: 주문 정보 업데이트
    const refundedAt = new Date().toISOString();
    const { error: refundUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'REFUNDED',
        refund_amount: refundToken.refund_amount,
        refund_reason: refundToken.refund_reason,
        refund_bank_code: bank_code,
        refund_account_number: account_number,
        refund_account_holder: account_holder,
        refunded_at: refundedAt,
        updated_at: refundedAt,
      })
      .eq('id', orderId);

    if (refundUpdateError) {
      console.error('[Refund Account API] 주문 업데이트 실패:', refundUpdateError);
      // 환불은 완료되었으므로 계속 진행
    }

    // 7. 토큰 사용 처리
    await supabase
      .from('refund_tokens')
      .update({ used: true })
      .eq('id', refundToken.id);

    // 8. 고객에게 환불 완료 SMS 발송
    const bankName = getBankName(bank_code);
    const smsText = createRefundCompleteSMS({
      customerName: order.customer.name,
      refundAmount: refundToken.refund_amount,
      bankName: bankName,
      accountNumber: account_number,
    });

    const smsResult = await sendSMS(order.customer.phone, smsText);
    if (!smsResult.success) {
      console.error('[Refund Account API] SMS 발송 실패:', smsResult.error);
    }

    // 9. Slack 알림 발송
    const slackMessage = createRefundCompleteNotification({
      orderId: order.id,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      aptName: order.apt_name,
      dong: order.dong,
      ho: order.ho,
      refundAmount: refundToken.refund_amount,
      bankName: bankName,
      accountNumber: account_number,
      accountHolder: account_holder,
    });

    const slackResult = await sendSlackMessage(slackMessage);
    if (!slackResult.success) {
      console.error('[Refund Account API] Slack 알림 실패:', slackResult.error);
    }

    console.log(`[Refund Account API] 환불 완료: ${orderId}, ${refundToken.refund_amount}원`);

    return NextResponse.json({
      success: true,
      message: '환불 처리가 완료되었습니다. 영업일 기준 3일 이내 입금됩니다.',
    });
  } catch (error: any) {
    console.error('[Refund Account API] POST error:', error);

    // 에러 발생 시 Slack 알림
    if (orderId && orderData) {
      await sendSlackMessage(createErrorAlert({
        errorType: '환불 처리 중 오류',
        errorMessage: error.message || 'Unknown error',
        orderId: orderId,
        customerName: orderData.customer?.name,
        customerPhone: orderData.customer?.phone,
        aptName: orderData.apt_name,
        timestamp: new Date().toISOString(),
      }));
    }

    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
