/**
 * 증정 이벤트 — 올때 자체앱 주문 15,000원 이상이면 제로식혜 1개 (사장님 2026-11-26 승인).
 * 손님 화면(남은 금액 안내)·서버 금액 계산(증정 줄)·토스포스 주문 줄이 모두 이 파일을 쓴다. 서버가 항상 다시 계산한다(브라우저 값은 믿지 않음).
 *
 * 끄는 법: GIFT_SIKHYE_ENABLED 를 false 로 바꾸고 배포하거나, GIFT_SIKHYE_END 에 끝 시각(+09:00)을 적는다. 둘 다 화면 문구와 증정 줄이 같이 사라진다.
 * 증정 상품은 포스 메뉴판에서 이름에 「식혜」가 든 상품을 찾는다(가격은 메뉴판 값 — 여기에 적지 않는다).
 * 메뉴판에 없거나 품절·판매중지면 증정도 안내 문구도 없다(못 주는 걸 약속하지 않는다).
 * 클라이언트에서도 import 하므로 서버 전용 코드를 넣지 않는다.
 */
import type { PricedLine } from './pricing';

export const GIFT_SIKHYE_ENABLED = true;
export const GIFT_SIKHYE_START = '2026-11-26T00:00:00+09:00';
/** 끝 시각(미포함). null = 정해진 끝 없음 */
export const GIFT_SIKHYE_END: string | null = null;
/** 음식값(할인 뒤 손님이 내는 값, 증정 줄 제외)이 이 금액 이상이면 증정 */
export const GIFT_THRESHOLD = 15000;
/** 포스 주문서·화면에 찍히는 할인 이름 */
export const GIFT_LABEL = '15,000원 이상 증정';
/** 증정 줄 표시 이름용 */
export const GIFT_NAME = '제로식혜';

export interface GiftItem {
  itemId: string;
  title: string;
  /** 포스 메뉴판 현재 가격(증정 줄의 할인액이 된다) */
  price: number;
}

export function giftWindowOpen(now: Date = new Date()): boolean {
  if (!GIFT_SIKHYE_ENABLED) return false;
  const t = now.getTime();
  return t >= Date.parse(GIFT_SIKHYE_START) && (GIFT_SIKHYE_END == null || t < Date.parse(GIFT_SIKHYE_END));
}

/** 포스 카탈로그 원본에서 증정 상품 찾기 — 판매 중·활성·포장 가능한 것만, 없으면 null */
export function findGiftItem(raw: { id: string; title: string; state: string; enabled: boolean; price: { priceValue: number } | null; diningOptions: string[] | null }[]): GiftItem | null {
  const hit = raw.find((r) => r.title.includes('식혜') && r.enabled && r.state === 'ON_SALE' && (!r.diningOptions || r.diningOptions.includes('TOGO')) && (r.price?.priceValue ?? 0) > 0);
  return hit ? { itemId: hit.id, title: hit.title, price: hit.price!.priceValue } : null;
}

export interface GiftStatus {
  /** 이벤트 문구를 보일지 (증정 상품 있음 + 기간 안) */
  active: boolean;
  /** 증정 대상인가 */
  eligible: boolean;
  /** 대상이 되기까지 남은 금액 (대상이면 0) */
  remaining: number;
  /** 0~1 */
  progress: number;
}

/** payTotal = 손님이 내는 음식값(증정 줄 제외). 서버·화면 공용 */
export function giftStatus(payTotal: number, gift: GiftItem | null | undefined, now?: Date): GiftStatus {
  if (!gift || !giftWindowOpen(now)) return { active: false, eligible: false, remaining: 0, progress: 0 };
  const eligible = payTotal >= GIFT_THRESHOLD;
  return { active: true, eligible, remaining: eligible ? 0 : GIFT_THRESHOLD - Math.max(0, payTotal), progress: Math.min(1, Math.max(0, payTotal) / GIFT_THRESHOLD) };
}

/** 증정 줄 — 포스에는 제로식혜 1개 + 전액 FIXED_AMOUNT 할인(세트할인 줄과 같은 모양)으로 들어간다. 합계는 그대로 */
export function giftLine(gift: GiftItem): PricedLine {
  return {
    itemId: gift.itemId,
    title: gift.title,
    qty: 1,
    basePrice: gift.price,
    choices: [],
    unitList: gift.price,
    unitDiscount: gift.price,
    discounts: [{ title: GIFT_LABEL, amountPerUnit: gift.price }],
    lineList: gift.price,
    lineDiscount: gift.price,
    lineTotal: 0,
    gift: true,
  };
}
