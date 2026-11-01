/**
 * 주문 만들기 API (R1)
 * POST /api/orders/create
 *
 * Body: { items: {sku, qty}[], name, phone, pickupDate, pickupTime,
 *         personalInfoConsent: true, marketingOptIn, source }
 *
 * 가격·합계·할인은 받지 않는다. 서버가 PRODUCTS + calculateDangolDiscount 로 다시 계산한다.
 * 응답: { orderId, amount, accessToken }  (accessToken 은 이후 조회·결제·현금영수증에 필요한 주문 열쇠)
 * 개발 환경에서만 ?dryRun=1 → DB 에 쓰지 않고 계산 결과만 돌려준다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { EVENT_APT_CODE, getOrderCutoffForDate } from '@/lib/constants';
import { computeOrder, sanitizeSource, validatePickup } from '@/lib/orderCreate';
import { makeOrderToken } from '@/lib/orderAccess.server';

export const dynamic = 'force-dynamic';

const bad = (error: string, status = 400) =>
  NextResponse.json({ success: false, error }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return bad('요청 형식이 올바르지 않습니다.');
    }

    const phone = String(body?.phone ?? '').replace(/-/g, '');
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!/^01[0-9]{8,9}$/.test(phone)) return bad('올바른 휴대폰 번호를 입력해주세요.');
    if (name.length < 1 || name.length > 30) return bad('이름은 1~30자로 입력해주세요.');
    if (body?.personalInfoConsent !== true) return bad('개인정보 수집 및 이용에 동의해주세요.');

    const source = sanitizeSource(body?.source);
    const computed = computeOrder(body?.items, source);
    if (!computed.ok) return bad(computed.error);
    const c = computed.value;

    const pickup = validatePickup(body?.pickupDate, body?.pickupTime, c);
    if (!pickup.ok) return bad(pickup.error);
    const pickupDate: string = body.pickupDate;
    const pickupTime: string = body.pickupTime;
    const marketingOptIn = body?.marketingOptIn === true;

    if (process.env.NODE_ENV !== 'production' && request.nextUrl.searchParams.get('dryRun') === '1') {
      return NextResponse.json({
        success: true,
        dryRun: true,
        amount: c.totalAmount,
        items: c.lines,
        dangolDiscount: c.dangolDiscount,
      });
    }

    // Database 제네릭이 supabase-js 버전 차이로 never 로 추론되므로(기존 라우트 동일) 느슨한 타입 사용
    const supabase: any = createServerSupabaseClient();

    // 고객 찾기/만들기 (있으면 id 재사용, 이름은 덮어쓰지 않음)
    let customerId: string;
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .order('created_at', { ascending: true })
      .limit(1);

    if (existing && existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const { data: created, error: customerError } = await supabase
        .from('customers')
        .insert({ phone, name, marketing_opt_in: marketingOptIn })
        .select('id')
        .single();
      if (customerError || !created) {
        console.error('[OrderCreate] customer insert failed:', customerError?.message);
        return bad('고객 정보 저장에 실패했습니다.', 500);
      }
      customerId = created.id;
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        status: 'CREATED',
        total_qty: c.totalQty,
        total_amount: c.totalAmount,
        payment_method: 'card',
        source,
        apt_code: EVENT_APT_CODE,
        apt_name: '전골이벤트',
        dong: '-',
        ho: '-',
        delivery_date: pickupDate,
        cutoff_at: getOrderCutoffForDate(pickupDate),
        is_pickup: true,
        pickup_discount: 0,
        dangol_discount: c.dangolDiscount,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[OrderCreate] order insert failed:', orderError?.message);
      return bad('주문 생성에 실패했습니다.', 500);
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      c.lines.map((l) => ({
        order_id: order.id,
        sku: l.sku,
        qty: l.qty,
        unit_price: l.unit_price,
        line_amount: l.line_amount,
      }))
    );

    if (itemsError) {
      console.error('[OrderCreate] order_items insert failed:', itemsError.message);
      // 삭제하지 않고 취소 표시 (데이터 삭제 금지 원칙). DB enum 값은 CANCELLED (CANCELED 는 없음)
      await supabase
        .from('orders')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', order.id);
      return bad('주문 상품 저장에 실패했습니다.', 500);
    }

    return NextResponse.json(
      { success: true, orderId: order.id, amount: c.totalAmount, accessToken: makeOrderToken(order.id) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[OrderCreate] Unexpected error:', error instanceof Error ? error.message : error);
    return bad('주문 처리 중 오류가 발생했습니다.', 500);
  }
}
