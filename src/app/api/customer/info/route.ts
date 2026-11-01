/**
 * 고객 정보 조회 API
 * 
 * 번호 인증 쿠키의 전화번호로 기존 고객의 이름과 최근 배송지(동호수)를 조회합니다.
 * 인증이 없으면 401 (주소의 phone 은 무시 — 번호만 알면 이름·동호수를 돌려주던 구멍).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getSessionPhone } from '@/lib/orderAccess.server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const phone = getSessionPhone(request);

    if (!phone) {
      return NextResponse.json(
        { error: '전화번호 인증이 필요합니다.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const supabase: any = createServerSupabaseClient();

    // 고객 정보 조회
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (customerError || !customer) {
      // 신규 고객인 경우
      return NextResponse.json({
        name: '',
        dong: '',
        ho: '',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 가장 최근 주문의 동호수 조회
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('dong, ho')
      .eq('customer_id', customer.id)
      .not('apt_code', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      name: customer.name || '',
      dong: lastOrder?.dong || '',
      ho: lastOrder?.ho || '',
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    console.error('[API] Customer info error:', error);
    return NextResponse.json(
      {
        error: error.message || '고객 정보 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
