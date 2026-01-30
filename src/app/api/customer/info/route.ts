/**
 * 고객 정보 조회 API
 * 
 * 전화번호로 기존 고객의 이름과 최근 배송지(동호수)를 조회합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: '전화번호가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

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
      });
    }

    // 가장 최근 주문의 동호수 조회
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('dong, ho')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      name: customer.name || '',
      dong: lastOrder?.dong || '',
      ho: lastOrder?.ho || '',
    });

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
