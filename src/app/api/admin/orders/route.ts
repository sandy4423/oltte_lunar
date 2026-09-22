/**
 * 관리자 주문 목록 조회 API
 * 
 * 서버에서 SERVICE ROLE KEY를 사용하여 주문을 조회합니다.
 * RLS를 우회하여 관리자 권한으로 접근합니다.
 *
 * 이 화면은 만두 매장(1호점) 관리화면이므로 만두 매장 주문만 돌려줍니다.
 * 같은 DB 에 빙수 매장(2호점) 과일 캠페인 주문이 함께 들어 있는데, 그것까지
 * 돌려주면 상단 통계(건수·매출)와 '상품별 준비 수량'이 과일과 뒤섞입니다.
 * 떡국만두 캠페인은 만두 매장 주문이라 그대로 포함됩니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/adminAuth.server';
import { MANDU_STORE_ID } from '@/lib/stores';
import { ORDER_ITEMS_SELECT } from '@/lib/orderItemName';

// 캐싱 비활성화 - 항상 최신 데이터 조회
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth(request);
    if (authError) return authError;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`*, customer:customers(*), ${ORDER_ITEMS_SELECT}`)
      .eq('store_id', MANDU_STORE_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin API] Fetch orders error:', error);
      return NextResponse.json(
        {
          success: false,
          timestamp: new Date().toISOString(),
          error: '주문 목록 조회에 실패했습니다.',
          count: 0,
          data: [],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: data?.length || 0,
      data: data || [],
    });
  } catch (error: any) {
    console.error('[Admin API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message || '서버 오류가 발생했습니다.',
        count: 0,
        data: [],
      },
      { status: 500 }
    );
  }
}
