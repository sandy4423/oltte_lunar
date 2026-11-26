/** 2번째 주문 할인 — DB 조회 쪽 (서버 전용). 판정 규칙은 secondOrder.ts */
import { orderStore, type JacheOrder } from './orderStore.server';
import { secondOrderEligible, usedSecondOrder } from './secondOrder';

/** 이 번호가 지금 2번째 주문 할인 대상인가. 조회가 실패하면 false (할인을 못 줄 뿐 주문은 막지 않는다) */
export async function secondOrderForPhone(phone: string, test: boolean, now?: Date): Promise<boolean> {
  try {
    return secondOrderEligible(await orderStore().listByPhone(phone), test, now);
  } catch (e) {
    console.error('[jache] 2번째 주문 자격 조회 실패', e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * 결제 승인 직전 재확인: 이 주문에 할인이 들어 있다면, 같은 번호의 다른 주문(결제 끝남·시험 구분 동일)이 이미 이 할인을 썼으면 false.
 * 두 주문이 정확히 동시에 승인되면 둘 다 통과할 수 있다(잠금 없음) — 손실은 1,000원, 받아들인다.
 */
export async function secondOrderStillOpen(order: JacheOrder): Promise<boolean> {
  if (!usedSecondOrder(order)) return true;
  try {
    const all = await orderStore().listByPhone(order.phone);
    return !all.some((o) => o.id !== order.id && o.test === order.test && ['PAID', 'POS_SENDING', 'POS_OK', 'POS_FAILED'].includes(o.status) && usedSecondOrder(o));
  } catch (e) {
    console.error('[jache] 2번째 주문 재확인 실패', e instanceof Error ? e.message : e);
    return true; // 조회가 안 돼도 결제는 막지 않는다
  }
}
