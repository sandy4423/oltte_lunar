/**
 * 주문 상세 조회 API
 * GET /api/orders/detail?orderId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '주문번호가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers (
          phone,
          name
        ),
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('[OrderDetail] Error:', error);
    return NextResponse.json(
      { success: false, error: '주문 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
