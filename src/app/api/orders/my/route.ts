/**
 * 고객 주문내역 조회 API
 * GET /api/orders/my?phone=01012345678
 * 
 * 전화번호 인증이 완료된 고객의 주문 목록을 조회합니다.
 * 보안: verification_codes 테이블에서 최근 인증 완료 여부 확인
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { success: false, error: '전화번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 전화번호 정규화
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: '올바른 전화번호 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. 최근 인증 완료 여부 확인 (10분 이내)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: verificationData, error: verificationError } = await supabase
      .from('verification_codes')
      .select('id')
      .eq('phone', normalizedPhone)
      .eq('verified', true)
      .gte('created_at', tenMinutesAgo)
      .limit(1);

    if (verificationError || !verificationData || verificationData.length === 0) {
      return NextResponse.json(
        { success: false, error: '전화번호 인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 2. 고객 조회 (같은 전화번호로 여러 고객 레코드가 있을 수 있음)
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', normalizedPhone);

    if (customerError) {
      console.error('[MyOrders API] Customer query error:', customerError);
      return NextResponse.json(
        { success: false, error: '고객 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // 3. 해당 고객들의 주문 조회
    const customerIds = customers.map((c) => c.id);
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*)')
      .in('customer_id', customerIds)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (orderError) {
      console.error('[MyOrders API] Orders query error:', orderError);
      return NextResponse.json(
        { success: false, error: '주문 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
      count: orders?.length || 0,
    });
  } catch (error: any) {
    console.error('[MyOrders API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
