/**
 * 토스포스 웹훅 받기 — POST /api/menu/pos-webhook
 * 직원이 포스 현황에서 자체앱 주문의 「호출」(order.call.created.v1)을 누르면 조리완료 알림톡,
 * 「완료」(order.order.completed.v1)를 누르면 픽업완료 알림톡. 문자는 보내지 않는다(사장님 11-26).
 *  - 서명: HMAC-SHA256(TOSSPLACE_WEBHOOK_SECRET, `${x-toss-timestamp}.${rawBody}`) hex, 헤더 x-toss-signature = "v1=<hex>" (docs.tossplace.com/reference/open-api/webhook.html)
 *  - 한 주문·한 템플릿에 한 번만: jache_alimtalk_log 가 막는다(웹훅은 at-least-once)
 *  - 우리 주문이 아니거나(키오스크·포스 주문) 시험 주문이면 아무것도 안 하고 200
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServerSupabaseClient } from '@/lib/supabase';
import { orderStore } from '@/lib/jache/orderStore.server';
import { notifyOrder, type AlimtalkKey } from '@/lib/alimtalk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  const KEY: Record<string, AlimtalkKey> = { 'order.call.created.v1': 'ready', 'order.order.completed.v1': 'picked_up' };
  const key = KEY[String(ev?.type)];
  if (!key) return ok();

  const orderId = String(ev?.data?.orderId ?? '');
  const orderKey = String(ev?.data?.orderKey ?? '');
  if (!orderId && !orderKey) return ok();

  const sb = createServerSupabaseClient() as any;
  const { data: rows, error } = await sb
    .from('jache_orders')
    .select('id')
    .or(`pos_order_id.eq.${orderId.replace(/[^0-9A-Za-z_-]/g, '')},id.eq.${orderKey.replace(/[^0-9A-Za-z_-]/g, '')}`)
    .eq('is_test', false)
    .limit(1);
  if (error) {
    console.error('[pos-webhook] DB 오류', error.message);
    return NextResponse.json({ ok: false }, { status: 500 }); // 토스가 다시 보내게
  }
  if (!rows?.[0]) return ok(); // 우리 주문 아님·시험 주문
  const o = await orderStore().get(rows[0].id);
  if (!o || o.status === 'CANCELLED' || o.status === 'PENDING') return ok();
  const r = await notifyOrder(key, o); // 절대 던지지 않음. 실패해도 200 (기록 표에 failed 로 남음)
  console.log('[pos-webhook]', key, o.id, r.ok ? 'sent' : r.skipped ?? r.error);
  return ok();
}
