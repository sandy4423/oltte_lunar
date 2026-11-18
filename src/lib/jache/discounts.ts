/**
 * 자체앱 할인 규칙 — 한 곳에서만 정한다 (손님 화면 표시 + 서버 금액 계산 + 토스포스 주문 할인 줄이 모두 이 파일을 쓴다).
 *
 * 지금 규칙
 *  - 세트할인: 「쫄면세트 (1인 강력추천)」「쫄우동 세트」 1개마다 −1,000원
 *    (포스 표시가 14,500 → 손님이 내는 값 13,500. 포스 키오스크도 같은 이름 「세트할인」 FIXED_AMOUNT 로 찍는다)
 *  - 송도 불쫄면 세트에는 세트할인이 없다 (사장님 규칙)
 *
 * 앞으로 단골 이벤트 등을 더할 때: DISCOUNT_RULES 에 규칙을 추가한다. 할인·무료는 사장님 승인 뒤에만.
 * 클라이언트에서도 import 하므로 서버 전용 코드를 넣지 않는다.
 */

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

export interface AppliedDiscount {
  ruleId: string;
  title: string;
  amountPerUnit: number;
}

/** 상품 1개에 붙는 할인 목록 */
export function discountsFor(item: { itemId: string; title: string }): AppliedDiscount[] {
  return DISCOUNT_RULES.filter((r) => r.itemIds.includes(item.itemId) || r.itemTitles.includes(item.title)).map((r) => ({
    ruleId: r.id,
    title: r.title,
    amountPerUnit: r.amountPerUnit,
  }));
}

/** 상품 1개당 할인 합계 */
export function unitDiscountFor(item: { itemId: string; title: string }): number {
  return discountsFor(item).reduce((s, d) => s + d.amountPerUnit, 0);
}
