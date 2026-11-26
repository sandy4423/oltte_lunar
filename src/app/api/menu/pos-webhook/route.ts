/**
 * 토스포스 웹훅 받기 — POST /api/menu/pos-webhook
 * 직원이 포스 현황에서 자체앱 주문의 「호출」(order.call.created.v1)을 누르면 조리완료 알림톡,
 * 「완료」(order.order.completed.v1)를 누르면 픽업완료 알림톡. 문자는 보내지 않는다(사장님 11-26).
 *  - 서명: HMAC-SHA256(TOSSPLACE_WEBHOOK_SECRET, `${x-toss-timestamp}.${rawBody}`) hex, 헤더 x-toss-signature = "v1=<hex>" (docs.tossplace.com/reference/open-api/webhook.html)
 *  - 한 주문·한 템플릿에 한 번만: jache_alimtalk_log 가 막는다(웹훅은 at-least-once)
 *  - 포스에서 「취소」(order.order.cancelled.v1) → 자동 전액 환불 + 취소 알림톡 (사장님 11-26 결정 D1)
 *  - 우리 주문이 아니거나(키오스크·포스 주문) 시험 주문이면 아무것도 안 하고 200
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { orderStore, type JacheOrder } from '@/lib/jache/orderStore.server';
import { notifyOrder, type AlimtalkKey } from '@/lib/alimtalk';
import { refundOrder, slackSafe } from '@/lib/jache/refund.server';
import { findPosOrderByKey } from '@/lib/tossplace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

/** 포스에서 주문 취소 (docs.tossplace.com/reference/open-api/order/order-events.html). 개발자센터 웹훅 구독에 이 이벤트가 있어야 온다 */
const CANCEL_EVENT = 'order.order.cancelled.v1';

const ok = () => NextResponse.json({ ok: true });

function verify(raw: string, ts: string | null, sig: string | null): boolean {
  const secret = process.env.TOSSPLACE_WEBHOOK_SECRET;
  if (!secret || !ts || !sig) return false;
  if (!/^\d+$/.test(ts) || Math.abs(Date.now() - Number(ts)) > 10 * 60 * 1000) return false;
  const want = Buffer.from('v1=' + createHmac('sha256', secret).update(`${ts}.${raw}`, 'utf8').digest('hex'));
  const got = Buffer.from(sig.trim());
  return want.length === got.length && timingSafeEqual(want, got);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get('x-toss-timestamp'), req.headers.get('x-toss-signature'))) {
    console.error('[pos-webhook] 서명 불일치');
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let ev: any;
  try {
    ev = JSON.parse(raw);
  } catch {
    return ok();
  }
  const merchant = process.env.TOSSPLACE_MERCHANT_ID;
  if (merchant && String(ev?.merchantId) !== String(merchant)) return ok();
  // 진단: 어떤 이벤트가 오는지(번호·금액 없이 종류·주문 키 앞부분만)
  console.log('[pos-webhook]', ev?.type, String(ev?.data?.orderKey ?? ev?.data?.order?.orderKey ?? '').slice(0, 8), String(ev?.data?.source ?? ev?.data?.order?.source ?? ''));
  const type = String(ev?.type);
  const KEY: Record<string, AlimtalkKey> = { 'order.call.created.v1': 'ready', 'order.order.completed.v1': 'picked_up' };
  const key = KEY[type];
  if (!key && type !== CANCEL_EVENT) return ok();

  const orderId = String(ev?.data?.orderId ?? '');
  const orderKey = String(ev?.data?.orderKey ?? '');
  if (!orderId && !orderKey) return ok();

  let o;
  try {
    o = await orderStore().findByPos(orderId, orderKey); // 시험 주문은 찾지 않는다
  } catch (e) {
    console.error('[pos-webhook] DB 오류', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 }); // 토스가 다시 보내게
  }
  if (!o) return ok(); // 우리 주문 아님·시험 주문
  if (o.status === 'CANCELLED' || o.status === 'PENDING') return ok();

  if (type === CANCEL_EVENT) {
    await handlePosCancel(o);
    return ok(); // 환불 실패도 200 — 슬랙·보류 표시로 사람이 처리(토스가 같은 이벤트를 계속 다시 보내지 않게)
  }

  const r = await notifyOrder(key as AlimtalkKey, o); // 절대 던지지 않음. 실패해도 200 (기록 표에 failed 로 남음)
  console.log('[pos-webhook]', key, o.id, r.ok ? 'sent' : r.skipped ?? r.error);
  return ok();
}

/**
 * D1: 포스에서 자체앱 주문 취소 → 자동 전액 환불 + 취소 알림톡 (refundOrder 가 둘 다 함).
 * 서명된 이벤트지만 한 번 더 포스를 조회해 「정말 취소 상태」인지 본다. 조회가 안 되면 이벤트를 믿고 진행
 * (조회 권한 문제로 매번 500 을 주면 토스가 웹훅 전체를 끊을 수 있어서).
 */
async function handlePosCancel(o: JacheOrder) {
  const look = await findPosOrderByKey(o.id);
  if ('found' in look && look.found && look.orderState !== 'CANCELLED') {
    console.error('[pos-webhook] 취소 이벤트인데 포스 주문은', look.orderState, o.id);
    await slackSafe(`⚠️ 포스 「주문 취소」 알림이 왔는데 포스 주문은 ${look.orderState} 상태라 환불하지 않았어요\n주문 ${o.orderNumber} (${o.id}) — 포스에서 확인해 주세요`);
    return;
  }
  if ('error' in look) console.error('[pos-webhook] 취소 확인 조회 실패 — 이벤트대로 진행', o.id, look.error);
  const r = await refundOrder(o.id, '가게 사정', 'pos_cancel');
  console.log('[pos-webhook] cancel', o.id, r.ok ? (r.already ? 'already' : 'refunded') : r.skipped ?? r.error);
}
