/**
 * 자체앱 할인 규칙 — 한 곳에서만 정한다 (손님 화면 표시 + 서버 금액 계산 + 토스포스 주문 할인 줄이 모두 이 파일을 쓴다).
 *
 * 지금 규칙
 *  - 세트할인: 「쫄면세트 (1인 강력추천)」「쫄우동 세트」 1개마다 −1,000원
 *    (포스 표시가 14,500 → 손님이 내는 값 13,500. 포스 키오스크도 같은 이름 「세트할인」 FIXED_AMOUNT 로 찍는다)
 *  - 송도 불쫄면 세트에는 세트할인이 없다 (사장님 규칙)
 *
 *  - 퍼센트 할인(PERCENT_RULES): 기간 안에만, 세트할인 뺀 1개 값에서 % 를 깎는다(원 단위 버림)
 *    · 첫눈 10%: 2026-11-19 하루 (사장님 11-19 「단톡방에서만 할인할테니. 우리 자체앱으로만 할인 걸자」, 맥15 #h7651)
 *
 *  - 2번째 주문 할인(SECOND_ORDER_*): 번호당 딱 한 번, 주문 전체에서 1,000원 (기간 안, 사장님 2026-11-26 「자체앱 2번째 주문 1,000원 할인 (손님당 1번)」, 2주)
 *    · 자격 판정·금액 분배는 secondOrder.ts (서버가 DB 로 다시 판정). 증정(gift.ts) 기준 금액은 이 할인 「전」 값으로 본다
 *
 * 앞으로 단골 이벤트 등을 더할 때: DISCOUNT_RULES·PERCENT_RULES 에 규칙을 추가한다. 할인·무료는 사장님 승인 뒤에만.
 * 클라이언트에서도 import 하므로 서버 전용 코드를 넣지 않는다.
 */

import { getClientPromo } from './promo';

export interface DiscountRule {
  id: string;
  /** 포스 주문서·화면에 찍히는 할인 이름 */
  title: string;
  /** 토스포스 카탈로그 상품 id (우선) */
  itemIds: string[];
  /** 상품 id 가 바뀌어도 잡히도록 카탈로그 이름도 같이 본다 */
  itemTitles: string[];
  /** 1개마다 깎는 금액(원) */
  amountPerUnit: number;
}

export const DISCOUNT_RULES: DiscountRule[] = [
  {
    id: 'set-1000',
    title: '세트할인',
    itemIds: ['10054200', '18744444'],
    itemTitles: ['쫄면세트 (1인 강력추천)', '쫄우동 세트'],
    amountPerUnit: 1000,
  },
];

/** 2번째 주문 할인 — 끄는 법: ENABLED=false 로 배포하거나 END 를 앞당긴다 (둘 다 화면 문구와 할인이 같이 사라진다) */
export const SECOND_ORDER_ENABLED = true;
export const SECOND_ORDER_RULE_ID = 'second-order-1000';
export const SECOND_ORDER_TITLE = '2번째 주문 할인';
export const SECOND_ORDER_AMOUNT = 1000;
export const SECOND_ORDER_START = '2026-11-26T00:00:00+09:00';
/** 끝(미포함) = 12/10 23:59:59 까지 */
export const SECOND_ORDER_END = '2026-12-11T00:00:00+09:00';
/** 화면 표시용 마지막 날 */
export const SECOND_ORDER_UNTIL_LABEL = '12/10까지';

export function secondOrderWindowOpen(now: Date = new Date()): boolean {
  if (!SECOND_ORDER_ENABLED) return false;
  const t = now.getTime();
  return t >= Date.parse(SECOND_ORDER_START) && t < Date.parse(SECOND_ORDER_END);
}

export interface PercentRule {
  id: string;
  title: string;
  percent: number;
  /** 시작(포함)·끝(미포함) — 한국 시각을 +09:00 로 적는다 */
  start: string;
  end: string;
  /** 있으면 이 코드로 들어온 주문만 (promo.ts — ?d=코드) */
  code?: string;
}

export const PERCENT_RULES: PercentRule[] = [
  { id: 'first-snow-10', title: '첫눈 10%', percent: 10, start: '2026-11-19T00:00:00+09:00', end: '2026-11-20T00:00:00+09:00', code: 'dangol' }, // 단톡방 링크(?d=dangol)만 — 사장님 11-19
];

export function activePercentRules(now: Date = new Date(), code: string | null = null): PercentRule[] {
  const t = now.getTime();
  return PERCENT_RULES.filter((r) => t >= Date.parse(r.start) && t < Date.parse(r.end) && (!r.code || r.code === code));
}

export interface AppliedDiscount {
  ruleId: string;
  title: string;
  amountPerUnit: number;
}

/**
 * 상품 1개에 붙는 할인 목록.
 * unitList(1개 정가 = 기본가 + 선택지)를 주면 기간 중인 퍼센트 할인도 붙인다 — 세트할인 뺀 값 기준.
 */
export function discountsFor(item: { itemId: string; title: string }, unitList?: number, now?: Date, code?: string | null): AppliedDiscount[] {
  const fixed: AppliedDiscount[] = DISCOUNT_RULES.filter((r) => r.itemIds.includes(item.itemId) || r.itemTitles.includes(item.title)).map((r) => ({
    ruleId: r.id,
    title: r.title,
    amountPerUnit: r.amountPerUnit,
  }));
  if (unitList == null) return fixed;
  let rest = Math.max(0, unitList - fixed.reduce((s, d) => s + d.amountPerUnit, 0));
  const out = [...fixed];
  // code 를 안 주면 브라우저에 기억된 단톡방 코드(서버에선 없음 → 서버는 꼭 넘긴다)
  for (const r of activePercentRules(now, code === undefined ? getClientPromo() : code)) {
    const amt = Math.floor((rest * r.percent) / 100);
    if (amt > 0) {
      out.push({ ruleId: r.id, title: r.title, amountPerUnit: amt });
      rest -= amt;
    }
  }
  return out;
}

/** 상품 1개당 할인 합계 (unitList 를 주면 퍼센트 할인 포함) */
export function unitDiscountFor(item: { itemId: string; title: string }, unitList?: number): number {
  return discountsFor(item, unitList).reduce((s, d) => s + d.amountPerUnit, 0);
}

/** 화면에 빨간 글씨로 보일 할인 이름들 */
export function discountTitles(item: { itemId: string; title: string }, unitList?: number): string[] {
  return discountsFor(item, unitList).map((d) => d.title);
}
