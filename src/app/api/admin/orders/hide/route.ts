import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 주문 숨기기/보이기 API
 * 
 * POST /api/admin/orders/hide
 * 
 * Body:
 * - orderIds: string[] - 주문 ID 배열
 * - hidden: boolean - true: 숨기기, false: 보이기
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds, hidden } = body;

    // 입력 검증
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (typeof hidden !== 'boolean') {
      return NextResponse.json(
        { error: 'hidden은 boolean이어야 합니다.' },
        { status: 400 }
      );
    }

    // 일괄 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        is_hidden: hidden,
        updated_at: new Date().toISOString(),
      })
      .in('id', orderIds);

    if (updateError) {
      console.error('[HideOrders] Update error:', updateError);
      return NextResponse.json(
        { error: '주문 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(`[HideOrders] ${orderIds.length}개 주문 ${hidden ? '숨김' : '보임'} 처리 완료`);

    return NextResponse.json({
      success: true,
      count: orderIds.length,
      hidden,
    });

  } catch (error: any) {
    console.error('[HideOrders] Error:', error);
    return NextResponse.json(
      { error: error.message || '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
