/**
 * 주문 만들기 — 가격 계산·입력 검증 순수 함수 (서버 /api/orders/create 에서 사용)
 *
 * 브라우저가 보낸 가격·합계·할인은 받지 않는다. sku 와 수량만 받아
 * PRODUCTS(src/lib/constants.ts) 와 calculateDangolDiscount(src/lib/pricing.ts) 로 서버가 다시 계산한다.
 */

import {
  PRODUCTS,
  PICKUP_EVENT_DATES,
  PICKUP_EVENT_TIME_SLOTS,
  PICKUP_MIN_ORDER_AMOUNT,
  DANGOL_DISCOUNT_ELIGIBLE_SKUS,
  getAvailableEventDates,
  getAvailablePickupDates,
  getAvailableTimeSlots,
  getOrderCutoffForDate,
} from '@/lib/constants';
import { calculateDangolDiscount } from '@/lib/pricing';
import { isValidSource, type TrafficSource } from '@/types/source';
import type { CartItem } from '@/types/order';

export interface ComputedOrder {
  lines: { sku: CartItem['sku']; qty: number; unit_price: number; line_amount: number }[];
  totalQty: number;
  subtotal: number;
  dangolDiscount: number;
  totalAmount: number;
}

/** sku·수량 검증 + 가격 계산. 실패하면 error 문자열. */
export function computeOrder(
  rawItems: unknown,
  source: TrafficSource | null,
): { ok: true; value: ComputedOrder } | { ok: false; error: string } {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 20) {
    return { ok: false, error: '주문 상품을 선택해주세요.' };
  }
  const merged = new Map<string, number>();
  for (const it of rawItems) {
    const sku = (it as any)?.sku;
    const qty = (it as any)?.qty;
    if (typeof sku !== 'string' || !PRODUCTS.some((p) => p.sku === sku)) {
      return { ok: false, error: '알 수 없는 상품입니다.' };
    }
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return { ok: false, error: '수량이 올바르지 않습니다.' };
    }
    merged.set(sku, (merged.get(sku) ?? 0) + qty);
  }
  const lines: ComputedOrder['lines'] = [];
  for (const [sku, qty] of merged) {
    if (qty > 99) return { ok: false, error: '수량이 올바르지 않습니다.' };
    const product = PRODUCTS.find((p) => p.sku === sku)!;
    lines.push({ sku: product.sku, qty, unit_price: product.price, line_amount: product.price * qty });
  }
  const totalQty = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.line_amount, 0);
  const dangolDiscount = calculateDangolDiscount(
    lines.map((l) => ({ sku: l.sku, qty: l.qty })),
    source === 'dangol',
  );
  return { ok: true, value: { lines, totalQty, subtotal, dangolDiscount, totalAmount: subtotal - dangolDiscount } };
}

/** source 는 앱이 쓰는 값만 허용, 아니면 null */
export function sanitizeSource(raw: unknown): TrafficSource | null {
  return typeof raw === 'string' && isValidSource(raw) ? raw : null;
}

/**
 * 수령 날짜·시간 검증 (두 화면의 규칙 그대로).
 *  - 이벤트 주문(/order): PICKUP_EVENT_DATES 중 마감(당일 12:00) 전인 날, PICKUP_EVENT_TIME_SLOTS 시간, 전골 1개 이상
 *  - 픽업 주문(/pickup): 오늘부터 30일 중 가능한 날·시간, 합계 1만원 이상
 * 마감은 이벤트 주문에만 건다(픽업 주문은 오늘 오후 슬롯도 허용하는 기존 동작 유지).
 */
export function validatePickup(
  date: unknown,
  time: unknown,
  c: ComputedOrder,
): { ok: true } | { ok: false; error: string } {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false, error: '픽업 날짜와 시간을 선택해주세요.' };
  }
  if ((PICKUP_EVENT_DATES as string[]).includes(date)) {
    if (!getAvailableEventDates().includes(date) || new Date() >= new Date(getOrderCutoffForDate(date))) {
      return { ok: false, error: '주문 마감된 날짜입니다.' };
    }
    if (!PICKUP_EVENT_TIME_SLOTS.includes(time)) {
      return { ok: false, error: '선택할 수 없는 픽업 시간입니다.' };
    }
    const hotpotQty = c.lines
      .filter((l) => (DANGOL_DISCOUNT_ELIGIBLE_SKUS as readonly string[]).includes(l.sku))
      .reduce((a, l) => a + l.qty, 0);
    if (hotpotQty < 1) return { ok: false, error: '전골을 1개 이상 선택해주세요.' };
    return { ok: true };
  }
  if (!getAvailablePickupDates().includes(date) || !getAvailableTimeSlots(date).includes(time)) {
    return { ok: false, error: '선택할 수 없는 픽업 날짜·시간입니다.' };
  }
  if (c.subtotal < PICKUP_MIN_ORDER_AMOUNT) {
    return { ok: false, error: `최소 주문 금액은 ${PICKUP_MIN_ORDER_AMOUNT.toLocaleString()}원입니다.` };
  }
  return { ok: true };
}
