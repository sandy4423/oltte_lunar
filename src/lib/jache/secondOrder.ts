/**
 * 2번째 주문 할인 — 자격 판정(순수 함수)과 금액 분배. 규칙 값(기간·금액)은 discounts.ts 에 있다.
 * 번호(휴대폰)당 평생 한 번. 「성공한 이전 주문이 정확히 1건」일 때만 대상이다.
 *  - 성공한 주문 = 시험 주문 아님 + 취소 아님 + 결제 끝남(PAID·POS_SENDING·POS_OK·POS_FAILED). PENDING(결제 전)은 세지 않는다
 *  - 이전 주문이 할인 기간 전에 있어도 된다. 이미 이 할인을 쓴 주문이 하나라도 있으면(취소되지 않은 것) 다시는 없다
 * 서버 전용 값(DB 조회)은 secondOrder.server.ts. 여기엔 서버 코드를 넣지 않는다(화면에서도 import).
 */
import { SECOND_ORDER_AMOUNT, SECOND_ORDER_RULE_ID, SECOND_ORDER_TITLE, secondOrderWindowOpen } from './discounts';
import type { PricedLine } from './pricing';

/** 결제가 끝난 상태들 (PENDING·CANCELLED 제외) */
const PAID_STATES = ['PAID', 'POS_SENDING', 'POS_OK', 'POS_FAILED'];

export interface PriorOrderLite {
  status: string;
  test: boolean;
  lines: Pick<PricedLine, 'orderDiscount'>[];
}

export const usedSecondOrder = (o: PriorOrderLite) => (o.lines ?? []).some((l) => l.orderDiscount?.ruleId === SECOND_ORDER_RULE_ID);

/** 이 번호가 지금 주문에서 2번째 주문 할인을 받는가. test = 지금 주문이 시험 주문인가(시험은 시험 주문끼리만 센다) */
export function secondOrderEligible(prior: PriorOrderLite[], test: boolean, now?: Date): boolean {
  if (!secondOrderWindowOpen(now)) return false;
  const good = prior.filter((o) => o.test === test && PAID_STATES.includes(o.status));
  if (good.length !== 1) return false;
  return !good.some(usedSecondOrder);
}

/**
 * 주문 전체 1,000원을 줄에 나눠 붙인다 — 보통 가장 비싼 줄(증정 줄 제외) 하나에 몽땅. 줄 금액보다 크게는 깎지 않는다.
 * 포스에 「2번째 주문 할인」 줄 할인(FIXED_AMOUNT)으로 들어가 합계가 결제 금액과 맞는다. 줄이 모자라면 남은 만큼 다음 줄에.
 */
export function applySecondOrder(lines: PricedLine[]): number {
  // 결제 금액이 0원이 되면 결제가 안 되므로 최소 1원은 남긴다 (실제 메뉴에선 1,000원 이하 주문이 없어 일어나지 않음)
  let rest = Math.min(SECOND_ORDER_AMOUNT, lines.reduce((s, l) => s + l.lineTotal, 0) - 1);
  const target = rest;
  const order = lines.map((l, i) => i).filter((i) => !lines[i].gift).sort((a, b) => lines[b].lineTotal - lines[a].lineTotal);
  for (const i of order) {
    if (rest <= 0) break;
    const l = lines[i];
    const amt = Math.min(rest, l.lineTotal);
    if (amt <= 0) continue;
    l.orderDiscount = { ruleId: SECOND_ORDER_RULE_ID, title: SECOND_ORDER_TITLE, amount: amt };
    l.lineDiscount += amt;
    l.lineTotal -= amt;
    rest -= amt;
  }
  return target - rest;
}
