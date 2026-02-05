/**
 * 관리자 주문 상태 변경 API
 * 
 * 서버에서 SERVICE ROLE KEY를 사용하여 선택된 주문들의 상태를 일괄 변경합니다.
 * RLS를 우회하여 관리자 권한으로 접근합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { OrderStatus } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds, status } = body as { orderIds: string[]; status: OrderStatus };

    // 파라미터 검증
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: '변경할 상태가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 주문 상태 업데이트
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .in('id', orderIds);

    if (error) {
      console.error('[Admin API] Update status error:', error);
      return NextResponse.json(
        { error: '주문 상태 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(`[Admin API] Status changed to ${status} for ${orderIds.length} orders`);

    return NextResponse.json({
      success: true,
      updatedCount: orderIds.length,
    });
  } catch (error: any) {
    console.error('[Admin API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
