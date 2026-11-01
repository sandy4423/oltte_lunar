/**
 * 주문 상세 조회 API (R2)
 * GET /api/orders/detail?orderId=xxx&t=<주문 열쇠>
 *
 * 주문을 만든 브라우저가 받은 열쇠(t)가 맞을 때만 응답한다 (403).
 * 만두 주문(apt_code 있음)만 다룬다 — 과일 주문은 404.
 * 응답에는 화면에 쓰는 열만 담는다 (toss_secret·결제키·환불계좌 등 제외, 전화 가림).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ORDER_ITEMS_SELECT } from '@/lib/orderItemName';
import { verifyOrderToken, isManduOrder, pickOrderPublicFields } from '@/lib/orderAccess.server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const token = searchParams.get('t');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '주문번호가 필요합니다.' },
        { status: 400, headers: NO_STORE }
      );
    }

    if (!verifyOrderToken(orderId, token)) {
      return NextResponse.json(
        { success: false, error: '이 주문을 볼 수 있는 권한이 없습니다.' },
        { status: 403, headers: NO_STORE }
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
        ${ORDER_ITEMS_SELECT}
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order || !isManduOrder(order as any)) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { success: true, data: pickOrderPublicFields(order) },
      { headers: NO_STORE }
    );
  } catch (error: any) {
    console.error('[OrderDetail] Error:', error?.message);
    return NextResponse.json(
      { success: false, error: '주문 조회 중 오류가 발생했습니다.' },
      { status: 500, headers: NO_STORE }
    );
  }
}
