/**
 * 토스포스 웹훅 받기 — POST /api/menu/pos-webhook
 * 사장님 11-19 「조리 완료되었을 때만 문자 보내」 → 직원이 포스 현황에서 자체앱 주문의 「호출」을 누르면(order.call.created.v1)
 * 그 주문 손님에게 문자 1통. 접수 문자는 보내지 않는다.
 *  - 서명: HMAC-SHA256(TOSSPLACE_WEBHOOK_SECRET, `${x-toss-timestamp}.${rawBody}`) hex, 헤더 x-toss-signature = "v1=<hex>" (docs.tossplace.com/reference/open-api/webhook.html)
 *  - 같은 주문 두 번 보내지 않게 jache_orders.ready_sms_at 이 비어 있을 때만 채우고 보낸다(웹훅은 at-least-once)
 *  - 우리 주문이 아니거나(키오스크·포스 주문) 시험 주문이면 아무것도 안 하고 200
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

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
  if (ev?.type !== 'order.call.created.v1') return ok();

  const orderId = String(ev?.data?.orderId ?? '');
  const orderKey = String(ev?.data?.orderKey ?? '');
  if (!orderId && !orderKey) return ok();

  const sb = createServerSupabaseClient() as any;
  // 한 번만: ready_sms_at 이 비어 있는 우리 주문을 지금 시각으로 채우는 데 성공한 호출만 문자를 보낸다
  const { data: rows, error } = await sb
    .from('jache_orders')
    .update({ ready_sms_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .or(`pos_order_id.eq.${orderId.replace(/[^0-9A-Za-z_-]/g, '')},id.eq.${orderKey.replace(/[^0-9A-Za-z_-]/g, '')}`)
    .is('ready_sms_at', null)
    .eq('is_test', false)
    .select('id, order_number, phone');
  if (error) {
    console.error('[pos-webhook] DB 오류', error.message);
    return NextResponse.json({ ok: false }, { status: 500 }); // 토스가 다시 보내게
  }
  const o = rows?.[0];
  if (!o) return ok(); // 우리 주문 아님·이미 보냄·시험 주문

  const text = `[올때만두] ${o.order_number} 준비됐어요\n따뜻할 때 가져가세요\n사거리 모서리, 파출소 대각선 맞은편`;
  try {
    const r = await sendSMS(o.phone, text);
    if (!r.success) console.error('[pos-webhook] 문자 실패', o.id, r.error);
    else console.log('[pos-webhook] 조리 완료 문자 보냄', o.id);
  } catch (e) {
    console.error('[pos-webhook] 문자 오류', o.id, e);
  }
  return ok();
}
