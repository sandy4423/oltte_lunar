/**
 * 결제 승인 → 결제 완료 표시 → 토스포스 주문 생성 (서버 전용).
 * 돈이 걸린 순서: ① 우리 주문(PENDING)의 금액과 결제 금액 대조 ② 토스페이먼츠 승인 ③ PAID ④ 포스 주문(POS_OK / POS_FAILED)
 */
import { sendSlackMessage } from '@/lib/slack';
import { buildPosOrderBody, createPosOrderWithRetry, fetchCatalogFresh } from '@/lib/tossplace';
import { posDryRun, type TossKeys } from './config.server';
import { orderStore, type JacheOrder } from './orderStore.server';
import { resolvePosFailure } from './refund.server';

const TOSS_API = 'https://api.tosspayments.com/v1';
export const SIM_PREFIX = 'SIM_';

export type ConfirmOutcome =
  | { ok: true; approvedAt: string; simulated: boolean }
  | { ok: false; error: string };

/** 토스페이먼츠 결제 승인. 시험 모드에 시험 비밀 키가 없으면 SIM_ 결제키만 받아 승인을 흉내 낸다 */
export async function confirmTossPayment(keys: TossKeys, p: { paymentKey: string; orderId: string; amount: number }): Promise<ConfirmOutcome> {
  if (keys.simulate) {
    if (p.paymentKey !== `${SIM_PREFIX}${p.orderId}`) return { ok: false, error: '시험 결제키가 아니에요' };
    return { ok: true, approvedAt: new Date().toISOString(), simulated: true };
  }
  if (!keys.secretKey) return { ok: false, error: '결제 설정 오류' };
  try {
    const res = await fetch(`${TOSS_API}/payments/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keys.secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        // 같은 결제를 두 번 승인하지 않게 (토스 멱등키)
        'Idempotency-Key': `jache-${p.orderId}`,
      },
      body: JSON.stringify(p),
      cache: 'no-store',
    });
    const j: any = await res.json().catch(() => null);
    if (!res.ok || j?.status !== 'DONE') return { ok: false, error: j?.message || '결제 승인에 실패했어요' };
    if (j.totalAmount !== p.amount || j.orderId !== p.orderId) return { ok: false, error: '결제 금액이 맞지 않아요' };
    return { ok: true, approvedAt: j.approvedAt || new Date().toISOString(), simulated: false };
  } catch {
    return { ok: false, error: '결제 승인 중 연결이 끊겼어요' };
  }
}

export function posMemo(o: JacheOrder): string {
  const parts = [`픽업 ${o.pickupLabel}`, ...o.requests, `앱주문 ${o.orderNumber}`];
  const body = parts.join(' · ');
  return o.test ? `테스트 주문입니다. 조리하지 마세요 · ${body}` : body;
}

const slackSafe = (text: string) => sendSlackMessage(text).catch((e) => console.error('[jache] slack', e instanceof Error ? e.message : e));

/**
 * PAID 주문을 포스로 보낸다. PAID → POS_SENDING 으로 먼저 잡아 두 번 보내지 않는다.
 * 실패하면 POS_FAILED + 슬랙 → resolvePosFailure(포스 조회 → 있으면 POS_OK, 없으면 자동 환불 + 취소 알림톡).
 * 이 함수가 도중에 죽어 PAID·POS_SENDING·POS_FAILED 로 남아도 /api/cron/jache-recover 가 5분마다 이어서 처리한다.
 */
export async function sendToPos(orderId: string): Promise<JacheOrder | null> {
  const store = orderStore();
  const claimed = await store.update(orderId, { status: 'POS_SENDING' }, ['PAID']);
  if (!claimed) return store.get(orderId);

  let priceMeta;
  try {
    priceMeta = (await fetchCatalogFresh()).priceMeta;
  } catch {
    priceMeta = undefined; // 가격 칸 기본값으로 보낸다
  }
  const body = buildPosOrderBody({
    orderKey: claimed.id,
    orderNumber: claimed.orderNumber,
    lines: claimed.lines,
    listPrice: claimed.listPrice,
    discountAmount: claimed.discountAmount,
    totalAmount: claimed.totalAmount,
    memo: posMemo(claimed),
    approvedAt: claimed.paidAt ?? new Date().toISOString(),
    test: claimed.test,
    priceMeta,
  });

  if (posDryRun()) {
    console.log('[jache] POS dry-run body:', JSON.stringify(body));
    return store.update(orderId, { status: 'POS_OK', posOrderId: `DRYRUN-${claimed.id}`, posAttempts: claimed.posAttempts }, ['POS_SENDING']);
  }

  const r = await createPosOrderWithRetry(body);
  const attempts = claimed.posAttempts + r.attempts;
  if (r.ok) {
    return store.update(orderId, { status: 'POS_OK', posOrderId: r.posOrderId, posAttempts: attempts, posError: null }, ['POS_SENDING']);
  }

  // 재시도 끝에 4xx 가 오면 첫 시도가 실제로는 들어갔을 수도 있다 (중복 orderKey 거부) → 포스 확인 문구를 남긴다
  const maybeDup = r.attempts > 1 && !r.retryable;
  const err = `${r.error}${maybeDup ? ' (앞선 시도가 들어갔을 수 있음 — 포스 현황 확인)' : ''}`;
  const failed = await store.update(orderId, { status: 'POS_FAILED', posAttempts: attempts, posError: err.slice(0, 1000) }, ['POS_SENDING']);
  // 먼저 실패를 알리고(이 함수가 시간 한도로 죽어도 남게), 이어서 자동 마무리: 포스 조회 → 있으면 접수로 바로잡고, 없으면 자동 환불 + 취소 알림톡 (사장님 11-26 D2)
  await slackSafe(
    [
      `🚨 ${claimed.test ? '[테스트] ' : ''}자체앱 주문 포스 전송 실패 — 결제는 됨, 포스에 안 들어감`,
      `주문 ${claimed.orderNumber} (${claimed.id}) · ${claimed.totalAmount.toLocaleString('ko-KR')}원 · 픽업 ${claimed.pickupLabel}`,
      `시도 ${r.attempts}번 · ${err.slice(0, 300)}`,
      '→ 포스에 들어갔는지 조회한 뒤 없으면 자동 환불합니다 (결과는 다음 알림)',
    ].join('\n')
  );
  if (!failed) return store.get(orderId);
  await resolvePosFailure(orderId);
  return store.get(orderId);
}
