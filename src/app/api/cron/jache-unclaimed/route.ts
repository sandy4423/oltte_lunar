/**
 * 미수령 안내 알림톡 — GET /api/cron/jache-unclaimed (5분마다, vercel.json)
 * 조리완료 알림톡이 나간 지 20분이 지났는데 픽업완료(포스 「완료」)가 없는 자체앱 주문에 「음식이 가게에서 기다리고 있어요」 1회.
 * 한 주문에 한 번만(jache_alimtalk_log). 스위치 JACHE_ALIMTALK=1 이 꺼져 있으면 아무것도 하지 않는다. 문자 대체 없음.
 * 너무 오래된 건(90분 넘음)은 보내지 않는다 — 크론이 멈췄다 켜져도 옛 주문에 갑자기 가지 않게.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { orderStore } from '@/lib/jache/orderStore.server';
import { alimtalkOn, notifyOrder } from '@/lib/alimtalk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const WAIT_MIN = 20;
const MAX_AGE_MIN = 90;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!alimtalkOn()) return NextResponse.json({ ok: true, skipped: 'switch-off' });

  const sb = createServerSupabaseClient() as any;
  const now = Date.now();
  const { data: ready, error } = await sb
    .from('jache_alimtalk_log')
    .select('order_id, created_at')
    .eq('template_key', 'ready')
    .neq('status', 'skipped')
    .lte('created_at', new Date(now - WAIT_MIN * 60_000).toISOString())
    .gte('created_at', new Date(now - MAX_AGE_MIN * 60_000).toISOString())
    .limit(50);
  if (error) {
    console.error('[jache-unclaimed] 기록 조회 실패', error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (!ready?.length) return NextResponse.json({ ok: true, sent: 0 });

  const ids = ready.map((r: any) => r.order_id);
  const { data: others } = await sb.from('jache_alimtalk_log').select('order_id').in('order_id', ids).in('template_key', ['unclaimed', 'picked_up', 'cancelled']);
  const done = new Set((others ?? []).map((r: any) => r.order_id));

  let sent = 0;
  for (const r of ready) {
    if (done.has(r.order_id)) continue;
    const o = await orderStore().get(r.order_id);
    if (!o || o.test || o.status === 'CANCELLED') continue;
    const res = await notifyOrder('unclaimed', o, { readyAt: r.created_at });
    if (res.ok) sent++;
  }
  return NextResponse.json({ ok: true, candidates: ready.length, sent });
}
