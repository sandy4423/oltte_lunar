/**
 * 알림톡 발송 (Solapi 카카오 알림톡, 서버 전용).
 *  - 문자 대체 발송은 절대 없다: kakaoOptions.disableSms = true (사장님 11-26 「카톡 못받는 사람한테 문자 보내지마」)
 *  - 손님에게 가는 글은 카카오가 승인한 템플릿 5개 그대로다(변수만 채움) — 글을 여기서 만들지 않는다
 *  - 켜짐 스위치: JACHE_ALIMTALK=1 일 때만 보낸다. 시험 주문(is_test)은 보내지 않고 로그만
 *  - 같은 주문·같은 템플릿은 jache_alimtalk_log(order_id, template_key) 로 한 번만. 표가 없으면 안 보낸다
 *  - 어떤 경우에도 예외를 던지지 않는다(주문 흐름을 막지 않는다): {ok:false}
 * 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER, SOLAPI_KAKAO_PFID_MANDU, JACHE_ALIMTALK
 */
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase';
import { normalizePhone } from '@/lib/utils';
import type { JacheOrder } from '@/lib/jache/orderStore.server';
import { orderToken } from '@/lib/jache/orderStore.server';

export type AlimtalkKey = 'received' | 'ready' | 'unclaimed' | 'picked_up' | 'cancelled';

/** 카카오 승인 템플릿 (2026-11-26 솔라피에서 조회, 모두 APPROVED). 변수 이름은 승인 본문의 #{...} 그대로 */
export const TEMPLATES: Record<AlimtalkKey, { id: string; vars: string[] }> = {
  received: { id: 'KA01TP261119081451561W0lmvVMg9qR', vars: ['주문번호', '메뉴', '금액', '픽업시각', '주문링크'] }, // 만두_주문접수
  ready: { id: 'KA01TP261119081452400jf82raryUKY', vars: ['주문번호', '메뉴', '주문링크'] }, // 만두_조리완료
  unclaimed: { id: 'KA01TP261119081453611xjGxneua2b2', vars: ['주문번호', '준비시각', '가게전화', '주문링크'] }, // 만두_미수령안내
  picked_up: { id: 'KA01TP261119081454333KOnAQk8643n', vars: ['주문번호', '메뉴', '금액', '주문링크'] }, // 만두_픽업완료
  cancelled: { id: 'KA01TP261119081454973L8jtLfStuSD', vars: ['주문번호', '사유', '금액', '주문링크'] }, // 만두_주문취소
};

const API = 'https://api.solapi.com';
export const alimtalkOn = () => process.env.JACHE_ALIMTALK === '1';

export interface AlimtalkResult {
  ok: boolean;
  skipped?: string;
  messageId?: string;
  error?: string;
}

function authHeader(key: string, secret: string): string {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', secret).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 솔라피에 보낼 본문(순수 함수 — dry-run 에서도 같은 것을 쓴다). 변수가 빠졌으면 에러 */
export function buildPayload(p: { to: string; templateKey: AlimtalkKey; variables: Record<string, string> }):
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string } {
  const t = TEMPLATES[p.templateKey];
  const pfId = process.env.SOLAPI_KAKAO_PFID_MANDU || '';
  if (!pfId) return { ok: false, error: 'SOLAPI_KAKAO_PFID_MANDU 없음' };
  const variables: Record<string, string> = {};
  for (const v of t.vars) {
    const val = p.variables[v];
    if (val === undefined || val === '') return { ok: false, error: `변수 ${v} 비어 있음` };
    variables[`#{${v}}`] = String(val);
  }
  return {
    ok: true,
    body: {
      messages: [
        {
          to: normalizePhone(p.to),
          from: process.env.SOLAPI_SENDER_NUMBER || '',
          type: 'ATA',
          kakaoOptions: { pfId, templateId: t.id, variables, disableSms: true },
        },
      ],
    },
  };
}

/** (주문, 템플릿) 한 번만 보내려고 자리를 잡는다. 이미 sent/sending 이면 false. failed 는 다시 잡을 수 있다 */
async function claim(orderId: string, key: AlimtalkKey): Promise<boolean> {
  const sb: any = createServerSupabaseClient();
  const { error } = await sb.from('jache_alimtalk_log').insert({ order_id: orderId, template_key: key, status: 'sending' });
  if (!error) return true;
  if (error.code !== '23505') throw new Error(`log insert: ${error.message}`); // 표 없음 등 → 보내지 않는다
  const { data, error: e2 } = await sb
    .from('jache_alimtalk_log')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('template_key', key)
    .eq('status', 'failed')
    .select('order_id');
  if (e2) throw new Error(`log retry: ${e2.message}`);
  return !!data?.length;
}

async function finish(orderId: string, key: AlimtalkKey, patch: { status: 'sent' | 'failed' | 'skipped'; message_id?: string; error?: string }) {
  try {
    const sb: any = createServerSupabaseClient();
    await sb.from('jache_alimtalk_log').update({ ...patch, updated_at: new Date().toISOString() }).eq('order_id', orderId).eq('template_key', key);
  } catch (e) {
    console.error('[alimtalk] 기록 갱신 실패', orderId, key, e instanceof Error ? e.message : e);
  }
}

/** 낮은 수준 발송 (기록·스위치 없음). 문자 대체 없음 */
export async function sendAlimtalk(p: { to: string; templateKey: AlimtalkKey; variables: Record<string, string> }): Promise<AlimtalkResult> {
  try {
    const key = process.env.SOLAPI_API_KEY;
    const secret = process.env.SOLAPI_API_SECRET;
    if (!key || !secret) return { ok: false, error: 'SOLAPI 키 없음' };
    const phone = normalizePhone(p.to);
    if (!/^01[0-9]{8,9}$/.test(phone)) return { ok: false, error: '전화번호 형식' };
    const built = buildPayload(p);
    if (!built.ok) return { ok: false, error: built.error };
    const res = await fetch(`${API}/messages/v4/send-many/detail`, {
      method: 'POST',
      headers: { Authorization: authHeader(key, secret), 'Content-Type': 'application/json' },
      body: JSON.stringify(built.body),
    });
    const j: any = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: String(j?.errorMessage || `HTTP ${res.status}`).slice(0, 300) };
    const failed = j?.failedMessageList?.[0];
    if (failed) return { ok: false, error: String(failed.statusMessage || failed.statusCode || '발송 실패').slice(0, 300) };
    return { ok: true, messageId: j?.groupInfo?.groupId ?? j?.groupId ?? undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : 'unknown' };
  }
}

/* ───────── 주문 → 템플릿 변수 ───────── */

const cut = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const won = (n: number) => n.toLocaleString('ko-KR');

export function menuText(o: Pick<JacheOrder, 'lines'>): string {
  const first = o.lines[0]?.title ?? '만두';
  const rest = o.lines.reduce((s, l) => s + l.qty, 0) - (o.lines[0]?.qty ?? 0);
  return cut(`${first}${rest > 0 ? ` 외 ${rest}개` : ''}`);
}

/** 버튼 주소 `https://www.olttefood.com/#{주문링크}` 에 붙는 경로 (맨 앞 / 없이) */
export function orderLink(o: Pick<JacheOrder, 'id'>): string {
  return `menu/done/${o.id}?t=${orderToken(o.id)}`;
}

const shortNo = (o: Pick<JacheOrder, 'orderNumber'>) => o.orderNumber.replace(/^테스트-/, '');
const kstHm = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit', hour12: false }).format(new Date(iso));

export function variablesFor(
  key: AlimtalkKey,
  o: JacheOrder,
  extra: { reason?: string; readyAt?: string } = {}
): Record<string, string> {
  const base = { 주문번호: shortNo(o), 주문링크: orderLink(o) };
  switch (key) {
    case 'received':
      return { ...base, 메뉴: menuText(o), 금액: won(o.totalAmount), 픽업시각: cut(o.pickupLabel) };
    case 'ready':
      return { ...base, 메뉴: menuText(o) };
    case 'unclaimed':
      return { ...base, 준비시각: extra.readyAt ? kstHm(extra.readyAt) : '', 가게전화: '032-832-5012' };
    case 'picked_up':
      return { ...base, 메뉴: menuText(o), 금액: won(o.totalAmount) };
    case 'cancelled':
      return { ...base, 사유: cut(extra.reason || '가게 사정'), 금액: won(o.totalAmount) };
  }
}

/**
 * 주문 하나에 템플릿 하나를 보낸다 — 스위치·시험 주문·중복·표 없음을 모두 여기서 거른다. 절대 던지지 않는다.
 */
export async function notifyOrder(
  key: AlimtalkKey,
  o: JacheOrder,
  extra: { reason?: string; readyAt?: string } = {}
): Promise<AlimtalkResult> {
  try {
    if (!alimtalkOn()) return { ok: false, skipped: 'switch-off' };
    if (o.test) {
      console.log(`[alimtalk] 시험 주문이라 보내지 않음 ${key} ${o.id}`);
      return { ok: false, skipped: 'test-order' };
    }
    let mine: boolean;
    try {
      mine = await claim(o.id, key);
    } catch (e) {
      console.error('[alimtalk] 발송 기록 표 오류 — 보내지 않음', key, o.id, e instanceof Error ? e.message : e);
      return { ok: false, error: 'log-table' };
    }
    if (!mine) return { ok: false, skipped: 'already' };
    const r = await sendAlimtalk({ to: o.phone, templateKey: key, variables: variablesFor(key, o, extra) });
    if (r.ok) {
      await finish(o.id, key, { status: 'sent', message_id: r.messageId });
      console.log(`[alimtalk] 보냄 ${key} ${o.id}`);
    } else {
      await finish(o.id, key, { status: 'failed', error: r.error });
      console.error(`[alimtalk] 실패 ${key} ${o.id}`, r.error);
    }
    return r;
  } catch (e) {
    console.error('[alimtalk] 오류', key, e instanceof Error ? e.message : e);
    return { ok: false, error: 'exception' };
  }
}
