/**
 * 관리자 주문 목록 조회 API
 * 
 * 서버에서 SERVICE ROLE KEY를 사용하여 모든 주문을 조회합니다.
 * RLS를 우회하여 관리자 권한으로 접근합니다.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin API] Fetch orders error:', error);
      return NextResponse.json(
        { error: '주문 목록 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[Admin API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
