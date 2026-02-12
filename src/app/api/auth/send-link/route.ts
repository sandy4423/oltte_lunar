/**
 * 픽업시간 회신 링크 생성 및 SMS 발송 API
 * POST /api/auth/send-link
 * 
 * 관리자가 픽업시간 미선택 주문 고객에게 일회용 인증 링크를 SMS로 전송
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendSMS, createPickupTimeRequestSMS } from '@/lib/sms';
import { sendSlackMessage, createPickupTimeLinkSentAlert } from '@/lib/slack';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    // 필수 필드 확인
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '주문 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 주문 조회 (고객 정보 포함)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers (
          id,
          phone,
          name
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[SendLink] Order not found:', orderId, orderError);
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 픽업 주문 확인
    if (!order.is_pickup) {
      return NextResponse.json(
        { success: false, error: '픽업 주문만 가능합니다.' },
        { status: 400 }
      );
    }

    // 이미 픽업시간이 선택된 경우
    if (order.pickup_date && order.pickup_time) {
      return NextResponse.json(
        { success: false, error: '이미 픽업시간이 선택된 주문입니다.' },
        { status: 400 }
      );
    }

    // 고객 정보 확인
    if (!order.customer || !order.customer.phone) {
      return NextResponse.json(
        { success: false, error: '고객 정보가 없습니다.' },
        { status: 400 }
      );
    }

    // 랜덤 토큰 생성 (32바이트 = 64자리 hex)
    const token = crypto.randomBytes(32).toString('hex');

    // 만료 시간 설정 (30일 후)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 토큰 저장
    const { error: insertError } = await supabase
      .from('one_time_auth_tokens')
      .insert({
        customer_id: order.customer.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('[SendLink] Token insert failed:', insertError);
      return NextResponse.json(
        { success: false, error: '토큰 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 링크 생성
    const link = `https://www.olttefood.com/my-orders?token=${token}`;

    // 날짜 포맷팅
    const orderDate = format(new Date(order.created_at), 'M월 d일 (EEE)', { locale: ko });
    const deliveryDate = format(new Date(order.delivery_date), 'M월 d일 (EEE)', { locale: ko });

    // SMS 발송
    try {
      await sendSMS(
        order.customer.phone,
        createPickupTimeRequestSMS({
          customerName: order.customer.name,
          orderDate,
          deliveryDate,
          link,
        })
      );
      
      console.log(`[SendLink] SMS sent to ${order.customer.phone}`);
    } catch (smsError: any) {
      console.error('[SendLink] SMS error:', smsError);
      // SMS 실패 시에도 계속 진행 (토큰은 생성됨)
    }

    // Slack 알림
    try {
      await sendSlackMessage(
        createPickupTimeLinkSentAlert({
          orderId,
          customerName: order.customer.name,
          customerPhone: order.customer.phone,
          orderDate,
          deliveryDate,
          link,
        })
      );
      
      console.log(`[SendLink] Slack notification sent`);
    } catch (slackError) {
      console.error('[SendLink] Slack error:', slackError);
      // Slack 실패는 로그만 남기고 계속 진행
    }

    return NextResponse.json(
      {
        success: true,
        message: 'SMS가 전송되었습니다.',
        link, // 관리자가 확인할 수 있도록
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[SendLink] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
