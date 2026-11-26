/**
 * 자체앱 주문 자동 전액 환불 (서버 전용). 사장님 2026-11-26 결정 페이지 승인:
 *  D1 포스에서 자체앱 주문을 취소하면 → 카드 결제 자동 전액 환불 + 취소 알림톡
 *  D2 포스로 주문 전송이 끝내 실패하면 → 자동 전액 환불 + 취소 알림톡 (단, 포스에 이미 들어가 있으면 환불하지 않고 접수로 바로잡음)
 *
 * 돈이 걸린 규칙
 *  - 환불은 「돈을 받았고 아직 환불 안 한」 주문만: 상태 PAID·POS_SENDING·POS_OK·POS_FAILED + 결제키 있음. CANCELLED 는 이미 끝난 것
 *  - 토스페이먼츠 V1 취소(POST /v1/payments/{paymentKey}/cancel, 전액), 멱등키 `${주문id}refund` — 두 번 불러도 한 번만 취소
 *  - 시험 결제키(SIM_…)는 토스를 부르지 않고 취소로만 표시
 *  - 실패하면: 주문 상태는 그대로 두고 pos_error 앞에 「[자동환불 안 됨]」 표시 + 슬랙. 되살피기 크론은 이 표시가 있으면 다시 손대지 않는다(사람 몫)
 *  - 어떤 경우에도 예외를 던지지 않는다 — 웹훅·결제 승인 흐름을 막지 않는다
 *  - 새 DB 칸 없음: 전액 환불뿐이라 환불액 = total_amount, 환불 기록은 pos_error 메모(「[자동환불 완료 …]」)와 토스 결제 기록
 */
import { sendSlackMessage } from '@/lib/slack';
import { notifyOrder } from '@/lib/alimtalk';
import { findPosOrderByKey, type PosLookup } from '@/lib/tossplace';
import { isTestMode, tossKeys } from './config.server';
import { orderStore, type JacheOrder, type JacheStatus } from './orderStore.server';

const TOSS_API = 'https://api.tosspayments.com/v1';
const SIM_PREFIX = 'SIM_';
export const REFUND_HOLD = '[자동환불 안 됨]';
export const REFUND_DONE = '[자동환불 완료';
export const REFUNDABLE: JacheStatus[] = ['PAID', 'POS_SENDING', 'POS_OK', 'POS_FAILED'];

export type RefundTrigger = 'pos_cancel' | 'pos_failed';
export type RefundResult =
  | { ok: true; already: boolean; simulated: boolean; order: JacheOrder }
  | { ok: false; skipped?: string; error?: string };

export const isOnHold = (o: Pick<JacheOrder, 'posError'>) => !!o.posError?.startsWith(REFUND_HOLD);

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const kstNow = () =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const label = (o: JacheOrder) => `${o.test ? '[테스트] ' : ''}주문 ${o.orderNumber} (${o.id}) · ${won(o.totalAmount)}`;
const TRIGGER_TEXT: Record<RefundTrigger, string> = { pos_cancel: '포스에서 주문 취소', pos_failed: '포스 전송 실패' };

export const slackSafe = (text: string) =>
  sendSlackMessage(text).catch((e) => console.error('[jache-refund] slack', e instanceof Error ? e.message : e));

/** 지금 쓸 토스페이먼츠 비밀 키. 실결제 스위치가 나중에 꺼져도 이미 받은 돈은 돌려줄 수 있게 운영 키로 물러선다 */
function refundSecretKey(): string | null {
  try {
    const k = tossKeys();
    if (k?.secretKey) return k.secretKey;
  } catch {
    /* 시험 모드에 live 키 → 아래로 */
  }
  if (isTestMode()) return null;
  return process.env.TOSS_SECRET_KEY || null;
}

export type CancelOutcome = { ok: true; already: boolean } | { ok: false; error: string };

/** 토스페이먼츠 전액 취소 한 번. 이미 취소된 결제(ALREADY_CANCELED_PAYMENT)는 성공으로 본다 */
export async function cancelTossPayment(secretKey: string, paymentKey: string, orderId: string, cancelReason: string): Promise<CancelOutcome> {
  try {
    const res = await fetch(`${TOSS_API}/payments/${encodeURIComponent(paymentKey)}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${orderId}refund`,
      },
      body: JSON.stringify({ cancelReason }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const j: any = await res.json().catch(() => null);
    if (res.ok && j?.status === 'CANCELED') return { ok: true, already: false };
    if (j?.code === 'ALREADY_CANCELED_PAYMENT') return { ok: true, already: true };
    return { ok: false, error: `HTTP ${res.status} ${j?.code ?? ''} ${j?.message ?? ''}`.trim().slice(0, 300) };
  } catch (e) {
    return { ok: false, error: `연결 오류: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300) };
  }
}

const appendNote = (prev: string | null, note: string) => (prev ? `${note} | ${prev}` : note).slice(0, 1000);

/** 환불 못 함 표시 + 슬랙 (주문 상태는 그대로) */
async function hold(o: JacheOrder, why: string, trigger: RefundTrigger) {
  try {
    await orderStore().update(o.id, { posError: appendNote(o.posError, `${REFUND_HOLD} ${kstNow()} ${why}`) }, [o.status]);
  } catch (e) {
    console.error('[jache-refund] 보류 표시 실패', o.id, e instanceof Error ? e.message : e);
  }
  await slackSafe(
    [
      `🚨 자체앱 자동 환불 안 됨 — 손으로 처리해 주세요 (${TRIGGER_TEXT[trigger]})`,
      label(o),
      `이유: ${why}`,
      '→ 토스페이먼츠 관리자에서 결제 취소 + 손님께 연락. 처리 뒤 이 주문은 자동으로 다시 손대지 않습니다',
    ].join('\n')
  );
}

/**
 * 주문 한 건 전액 환불 → CANCELLED → 취소 알림톡. 던지지 않는다.
 * reason 은 토스 취소 사유 겸 알림톡 #{사유}.
 */
export async function refundOrder(orderId: string, reason: string, trigger: RefundTrigger): Promise<RefundResult> {
  const store = orderStore();
  let o: JacheOrder | null = null;
  try {
    o = await store.get(orderId);
    if (!o) return { ok: false, skipped: 'no-order' };
    if (o.status === 'CANCELLED') return { ok: true, already: true, simulated: false, order: o };
    if (!REFUNDABLE.includes(o.status) || !o.tossPaymentKey) return { ok: false, skipped: 'not-paid' };

    const simulated = o.tossPaymentKey.startsWith(SIM_PREFIX);
    let cancel: CancelOutcome;
    if (simulated) {
      cancel = { ok: true, already: false };
    } else {
      const secret = refundSecretKey();
      cancel = secret ? await cancelTossPayment(secret, o.tossPaymentKey, o.id, reason) : { ok: false, error: '토스페이먼츠 비밀 키 없음' };
    }

    if (!cancel.ok) {
      const cur = await store.get(orderId); // 같은 순간 다른 호출이 끝냈으면 알림 안 함
      if (cur?.status === 'CANCELLED') return { ok: true, already: true, simulated, order: cur };
      await hold(cur ?? o, `토스 취소 실패: ${cancel.error}`, trigger);
      return { ok: false, error: cancel.error };
    }

    const note = `${REFUND_DONE} ${kstNow()} ${won(o.totalAmount)} · ${TRIGGER_TEXT[trigger]}${simulated ? ' · 시험결제' : ''}]`;
    let done = await store.update(orderId, { status: 'CANCELLED', posError: appendNote(o.posError, note) }, REFUNDABLE);
    if (!done) {
      const cur = await store.get(orderId);
      if (cur?.status !== 'CANCELLED') {
        await slackSafe(`🚨 자체앱 환불은 됐는데 주문 표시를 못 바꿈 — 확인 필요\n${label(o)}\n지금 상태 ${cur?.status ?? '없음'}`);
        return { ok: false, error: 'status-write' };
      }
      done = cur;
    }

    const at = await notifyOrder('cancelled', done, { reason });
    const atText = at.ok ? '취소 카톡 보냄' : `취소 카톡 안 보냄(${at.skipped ?? at.error})`;
    if (!cancel.already) {
      await slackSafe([`↩️ 자체앱 자동 환불 완료 (${TRIGGER_TEXT[trigger]})`, label(done), `사유 「${reason}」 · ${atText}${simulated ? ' · 시험결제(토스 호출 없음)' : ''}`].join('\n'));
    }
    return { ok: true, already: cancel.already, simulated, order: done };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[jache-refund] 오류', orderId, msg);
    await slackSafe(`🚨 자체앱 자동 환불 중 오류 — 환불이 됐는지 토스페이먼츠에서 확인해 주세요\n${o ? label(o) : orderId}\n${msg.slice(0, 300)}`);
    return { ok: false, error: msg };
  }
}

export type PosFailureAction = 'none' | 'in_pos' | 'refunded' | 'hold';

/**
 * POS_FAILED 주문 마무리 (D2). 환불 전에 포스를 주문키로 조회해 「정말 안 들어갔는지」 본다:
 *  - 포스에 있음(취소 아님) → 환불하지 않고 POS_OK 로 바로잡음 + 접수 알림톡 (재시도 중 첫 시도가 들어갔던 경우)
 *  - 포스에 없음, 또는 포스에서 이미 취소됨 → 자동 환불
 *  - 조회가 안 됨 → 환불하지 않고 보류 + 슬랙 (모르면 돈을 움직이지 않는다)
 */
export async function resolvePosFailure(orderId: string, lookup: (key: string) => Promise<PosLookup> = findPosOrderByKey): Promise<PosFailureAction> {
  const store = orderStore();
  let o: JacheOrder | null = null;
  try {
    o = await store.get(orderId);
    if (!o || o.status !== 'POS_FAILED' || isOnHold(o)) return 'none';

    const look = await lookup(o.id);
    if ('error' in look) {
      await hold(o, `포스 조회가 안 돼 들어갔는지 모름 (${look.error})`, 'pos_failed');
      return 'hold';
    }
    if (look.found && look.orderState !== 'CANCELLED') {
      const fixed = await store.update(
        orderId,
        { status: 'POS_OK', posOrderId: look.id, posError: appendNote(o.posError, `[포스에 이미 있었음 ${kstNow()} — 환불 안 함]`) },
        ['POS_FAILED']
      );
      if (fixed) {
        await notifyOrder('received', fixed);
        await slackSafe(`✅ 자체앱 주문이 포스에 이미 들어가 있었어요 — 환불하지 않고 접수로 바로잡음\n${label(fixed)}`);
      }
      return 'in_pos';
    }
    const r = await refundOrder(orderId, '주문 전송 오류', 'pos_failed');
    return r.ok ? 'refunded' : 'hold';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[jache-refund] 포스 실패 마무리 오류', orderId, msg);
    await slackSafe(`🚨 자체앱 포스 실패 주문 마무리 중 오류 — 확인 필요\n${o ? label(o) : orderId}\n${msg.slice(0, 300)}`);
    return 'hold';
  }
}
