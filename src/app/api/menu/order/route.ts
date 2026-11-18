/**
 * 자체앱 주문 만들기 (결제 전) — POST /api/menu/order
 * Body: { lines: [{itemId, qty, choices:[{optionId, choiceId, qty}]}], pickup: 'now'|'HH:MM', requests: string[], agree: true }
 * 휴대폰은 인증 쿠키에서만 읽는다. 금액은 서버가 지금 메뉴판 + 할인 규칙으로 다시 계산한다.
 * 응답: { orderId, token, amount, orderName, clientKey, simulate }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSessionPhone } from '@/lib/orderAccess.server';
import { getClientIp, rateLimitHit, failClosed503, TRY_LATER_MESSAGE } from '@/lib/rateLimit.server';
import { fetchCatalogFresh } from '@/lib/tossplace';
import { priceCart, orderName } from '@/lib/jache/pricing';
import { REQUESTS, hhmm, kstNow, pickupState } from '@/lib/jache/cart';
import { isTestMode, paymentsEnabled, tossKeys } from '@/lib/jache/config.server';
import { orderStore, orderToken } from '@/lib/jache/orderStore.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  if (!paymentsEnabled()) return bad('결제는 준비 중이에요', 503);
  const keys = tossKeys();
  if (!keys) return bad('결제는 준비 중이에요', 503);

  const phone = getSessionPhone(req);
  if (!phone) return bad('휴대폰 인증을 다시 해 주세요', 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad('요청 형식이 올바르지 않아요');
  }
  if (body?.agree !== true) return bad('약관에 동의해 주세요');

  // 픽업 시간: 지금 영업 상태로 다시 확인
  const st = pickupState(kstNow());
  if (st.state !== 'open') return bad(st.state === 'closedDay' ? '오늘은 쉬는 날이에요' : '오늘 주문이 끝났어요');
  let pickup: string;
  let pickupLabel: string;
  if (body?.pickup === 'now') {
    if (!st.canNow) return bad('픽업 시간을 다시 골라 주세요');
    pickup = 'now';
    pickupLabel = '지금 바로';
  } else if (typeof body?.pickup === 'string' && /^\d{2}:\d{2}$/.test(body.pickup) && st.slots.map(hhmm).includes(body.pickup)) {
    pickup = body.pickup;
    pickupLabel = `오늘 ${body.pickup}`;
  } else {
    return bad('픽업 시간을 다시 골라 주세요');
  }

  const requests: string[] = Array.isArray(body?.requests) ? body.requests.filter((r: unknown) => (REQUESTS as readonly unknown[]).includes(r)) : [];

  let catalog;
  try {
    catalog = await fetchCatalogFresh();
  } catch {
    return bad('메뉴를 불러오지 못했어요. 잠시 후 다시 해 주세요', 502);
  }
  const priced = priceCart(body?.lines, catalog.menu);
  if (!priced.ok) return bad(priced.error, 409);

  // 주문 만들기 횟수 제한 (시험 모드는 운영 DB 를 쓰지 않으므로 건너뜀)
  if (!isTestMode()) {
    try {
      const okIp = await rateLimitHit(`jache-order-ip:${getClientIp(req)}`, 20, 3600);
      const ok = okIp && (await rateLimitHit(`jache-order-phone:${phone}`, 10, 3600));
      if (!ok) return bad(TRY_LATER_MESSAGE, 429);
    } catch (e) {
      return failClosed503('자체앱 주문 만들기', e instanceof Error ? e.message : String(e));
    }
  }

  const order = await orderStore().create({
    test: isTestMode(),
    phone,
    lines: priced.value.lines,
    listPrice: priced.value.listPrice,
    discountAmount: priced.value.discountAmount,
    totalAmount: priced.value.total,
    pickup,
    pickupLabel,
    requests: Array.from(new Set(requests)),
  });

  return NextResponse.json(
    {
      success: true,
      orderId: order.id,
      token: orderToken(order.id),
      amount: order.totalAmount,
      orderName: orderName(order.lines),
      clientKey: keys.clientKey,
      simulate: keys.simulate,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
