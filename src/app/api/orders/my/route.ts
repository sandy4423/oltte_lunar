/**
 * 고객 주문내역 조회 API
 * GET /api/orders/my
 *
 * 번호 인증 쿠키(oltte_phone_session)의 전화번호 주문만 돌려준다. 주소의 phone 은 무시한다
 * (예전엔 「그 번호가 최근 인증된 적 있음」만 봐서, 남이 인증한 직후 아무나 그 번호 주문을 볼 수 있었다).
 * 만두 주문(apt_code 있음)만, 민감한 열(결제키·secret·환불계좌 등)은 빼고 돌려준다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getSessionPhone, pickOrderPublicFields } from '@/lib/orderAccess.server';
import { ORDER_ITEM_COLUMNS_SELECT } from '@/lib/orderItemName';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const normalizedPhone = getSessionPhone(request);

    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: '전화번호 인증이 필요합니다.' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const supabase: any = createServerSupabaseClient();

    // 1. 고객 조회 (같은 전화번호로 여러 고객 레코드가 있을 수 있음)
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', normalizedPhone);

    if (customerError) {
      console.error('[MyOrders API] Customer query error:', customerError.message);
      return NextResponse.json(
        { success: false, error: '고객 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ success: true, data: [], count: 0 }, { headers: NO_STORE_HEADERS });
    }

    const customerIds = customers.map((c: any) => c.id);

    // 2. 주문 조회 (만두 주문만: apt_code 있음)
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .in('customer_id', customerIds)
      .eq('is_hidden', false)
      .not('apt_code', 'is', null)
      .order('created_at', { ascending: false });

    if (orderError) {
      console.error('[MyOrders API] Orders query error:', orderError.message);
      return NextResponse.json(
        { success: false, error: '주문 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, data: [], count: 0 }, { headers: NO_STORE_HEADERS });
    }

    // 3. 고객 정보 / order_items (조인 분리 - Supabase .in() + 임베디드 리소스 버그 우회)
    const { data: customerData } = await supabase
      .from('customers')
      .select('id, name, phone')
      .in('id', customerIds);

    const customerMap = new Map<string, any>((customerData || []).map((c: any) => [c.id, c]));

    const orderIds = orders.map((o: any) => o.id);
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(ORDER_ITEM_COLUMNS_SELECT)
      .in('order_id', orderIds);

    const orderItemsMap = new Map<string, any[]>();
    for (const item of orderItems || []) {
      const existing = orderItemsMap.get(item.order_id) || [];
      existing.push(item);
      orderItemsMap.set(item.order_id, existing);
    }

    const ordersWithRelations = orders.map((order: any) =>
      pickOrderPublicFields({
        ...order,
        customer: customerMap.get(order.customer_id) || null,
        order_items: orderItemsMap.get(order.id) || [],
      })
    );

    return NextResponse.json(
      { success: true, data: ordersWithRelations, count: ordersWithRelations.length },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    console.error('[MyOrders API] Unexpected error:', error?.message);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
