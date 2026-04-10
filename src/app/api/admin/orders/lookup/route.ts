/**
 * 직원용 주문 조회 API
 *
 * 핸드폰 뒤 4자리로 고객을 검색하여 이름과 주문 내역을 반환합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const phone4 = request.nextUrl.searchParams.get('phone4');
  if (!phone4 || phone4.length !== 4 || !/^\d{4}$/.test(phone4)) {
    return NextResponse.json(
      { success: false, error: '핸드폰 뒤 4자리를 입력해주세요.' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // 뒤 4자리로 고객 검색
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, phone, name')
    .like('phone', `%${phone4}`);

  if (customerError) {
    return NextResponse.json(
      { success: false, error: '고객 조회에 실패했습니다.' },
      { status: 500 }
    );
  }

  if (!customers || customers.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  // 해당 고객들의 결제 완료된 주문 조회
  const customerIds = customers.map((c) => c.id);
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .in('customer_id', customerIds)
    .in('status', ['PAID', 'LATE_DEPOSIT'])
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (orderError) {
    return NextResponse.json(
      { success: false, error: '주문 조회에 실패했습니다.' },
      { status: 500 }
    );
  }

  // 고객별로 주문 매핑
  const results = customers
    .map((customer) => ({
      customer,
      orders: (orders || []).filter((o) => o.customer_id === customer.id),
    }))
    .filter((r) => r.orders.length > 0);

  return NextResponse.json({ success: true, data: results });
}
