/**
 * 자체앱 멈춘 주문 되살피기 — GET /api/cron/jache-recover (5분마다, vercel.json)
 * 결제는 됐는데 포스 전송이 끝나지 않은 주문을 이어서 처리한다(점검 2·3번, 사장님 11-26 D2).
 * 결제 승인 함수 한도는 60초라 그보다 오래 「결제됨·전송 중」이면 그 실행은 죽은 것이다.
 *
 *  ① PAID·POS_SENDING 으로 3분 넘게 멈춤 + 결제 30분 안 → 포스에 한 번 더 보낸다(sendToPos).
 *     같은 주문키는 토스포스가 두 번 받지 않으므로 중복 주문은 생기지 않고, 실패하면 sendToPos 가 바로 ③과 같은 마무리를 한다
 *  ② PAID·POS_SENDING 인데 결제 30분 넘음(주방에 너무 늦음) → POS_FAILED 로 바꾸고 마무리
 *  ③ POS_FAILED 로 3분 넘게 있고 「[자동환불 안 됨]」 표시가 없음 → 마무리(포스 조회 → 있으면 접수로, 없으면 자동 환불)
 *  결제 12시간 넘은 주문은 건드리지 않는다. 한 번 실행에 포스 재전송은 1건만(재전송은 최대 약 50초 걸림).
 */
import { orderStore } from './orderStore.server';
import { sendToPos } from './checkout.server';
import { isOnHold, resolvePosFailure, slackSafe } from './refund.server';
import { notifyOrder } from '@/lib/alimtalk';

export const STUCK_MIN = 3;
export const RESEND_WINDOW_MIN = 30;
export const MAX_AGE_H = 12;

export async function recoverJacheOrders(now = Date.now()) {
  const store = orderStore();
  const started = Date.now();
  let list;
  try {
    list = await store.listForRecovery(new Date(now - MAX_AGE_H * 3600_000).toISOString());
  } catch (e) {
    console.error('[jache-recover] 조회 실패', e instanceof Error ? e.message : e);
    return { ok: false };
  }
  const log: string[] = [];
  let resent = 0;
  for (const o of list) {
    if (Date.now() - started > 40_000) break; // 남은 건 다음 실행
    const idleMin = (now - Date.parse(o.updatedAt)) / 60_000;
    if (idleMin < STUCK_MIN) continue; // 지금 다른 실행이 처리 중일 수 있음
    const paidMin = (now - Date.parse(o.paidAt ?? o.updatedAt)) / 60_000;

    if (o.status === 'PAID' || o.status === 'POS_SENDING') {
      if (paidMin <= RESEND_WINDOW_MIN) {
        if (resent >= 1 || Date.now() - started > 5_000) continue; // 재전송은 최대 약 50초 — 한도 60초 안에 끝나게
        resent++;
        // 죽은 실행이 잡아 둔 POS_SENDING 을 PAID 로 풀어 sendToPos 가 다시 잡게 한다
        if (o.status === 'POS_SENDING' && !(await store.update(o.id, { status: 'PAID' }, ['POS_SENDING']))) continue;
        await slackSafe(`⏳ 자체앱 주문이 ${Math.round(idleMin)}분째 포스 전송에서 멈춰 있어 다시 보냅니다\n주문 ${o.orderNumber} (${o.id})`);
        const after = await sendToPos(o.id);
        if (after?.status === 'POS_OK') await notifyOrder('received', after);
        log.push(`${o.id} resend→${after?.status}`);
      } else {
        const failed = await store.update(
          o.id,
          { status: 'POS_FAILED', posError: `${Math.round(paidMin)}분 동안 포스 전송이 끝나지 않음${o.posError ? ` | ${o.posError}` : ''}`.slice(0, 1000) },
          ['PAID', 'POS_SENDING']
        );
        if (failed) log.push(`${o.id} stale→${await resolvePosFailure(o.id)}`);
      }
      continue;
    }

    if (o.status === 'POS_FAILED' && !isOnHold(o)) {
      log.push(`${o.id} failed→${await resolvePosFailure(o.id)}`);
    }
  }
  if (log.length) console.log('[jache-recover]', log.join(', '));
  return { ok: true, candidates: list.length, handled: log };
}
