/**
 * 가격 계산 순수 함수
 *
 * useCart(장바구니 표시)와 useOrderSubmit(서버 저장/결제) 양쪽에서 공유.
 * 할인 로직은 이 파일 하나에만 존재해야 한다.
 */

import {
  DANGOL_DISCOUNT_ELIGIBLE_SKUS,
  DANGOL_DISCOUNT_PER_ITEM,
  NOODLE_DISCOUNT_PER_ITEM,
  NOODLE_DISCOUNT_SKU,
} from './constants';
import type { CartItem } from '@/types/order';

/**
 * 단골톡방 할인 금액 계산
 * - 전골(시원/얼큰): 1개당 2,000원
 * - 칼국수: 1개당 500원
 */
export function calculateDangolDiscount(cart: CartItem[], isDangol: boolean): number {
  if (!isDangol) return 0;

  return cart.reduce((acc, item) => {
    if ((DANGOL_DISCOUNT_ELIGIBLE_SKUS as readonly string[]).includes(item.sku)) {
      return acc + DANGOL_DISCOUNT_PER_ITEM * item.qty;
    }
    if (item.sku === NOODLE_DISCOUNT_SKU) {
      return acc + NOODLE_DISCOUNT_PER_ITEM * item.qty;
    }
    return acc;
  }, 0);
}

/**
 * 상세보기용 할인 breakdown 계산
 *
 * OrderDetailDialog에서 order_items를 기반으로 소계·단골할인·칼국수할인·합계를 표시하기 위해 사용.
 * - `subtotal`: 정가 기준 소계 (line_amount 합 = unit_price * qty 합)
 * - `hotpotDiscount`: 전골 단골 할인 금액 (전골 수량 × 2,000)
 * - `noodleDiscount`: 칼국수 단골 할인 금액 (칼국수 수량 × 500)
 * - `dangolTotal`: 단골 할인 총합 (source === 'dangol'일 때만 >0)
 * - `hotpotQty`, `noodleQty`: 각 할인 breakdown 표시용 수량
 */
export interface DiscountBreakdown {
  subtotal: number;
  hotpotQty: number;
  noodleQty: number;
  hotpotDiscount: number;
  noodleDiscount: number;
  dangolTotal: number;
}

interface LineItemLike {
  sku: string;
  qty: number;
  unit_price: number;
  line_amount?: number;
}

export function calculateDiscountBreakdown(
  items: LineItemLike[],
  source: string | null | undefined,
): DiscountBreakdown {
  const isDangol = source === 'dangol';

  let subtotal = 0;
  let hotpotQty = 0;
  let noodleQty = 0;

  for (const item of items) {
    subtotal += item.line_amount ?? item.unit_price * item.qty;
    if ((DANGOL_DISCOUNT_ELIGIBLE_SKUS as readonly string[]).includes(item.sku)) {
      hotpotQty += item.qty;
    } else if (item.sku === NOODLE_DISCOUNT_SKU) {
      noodleQty += item.qty;
    }
  }

  const hotpotDiscount = isDangol ? hotpotQty * DANGOL_DISCOUNT_PER_ITEM : 0;
  const noodleDiscount = isDangol ? noodleQty * NOODLE_DISCOUNT_PER_ITEM : 0;
  const dangolTotal = hotpotDiscount + noodleDiscount;

  return {
    subtotal,
    hotpotQty,
    noodleQty,
    hotpotDiscount,
    noodleDiscount,
    dangolTotal,
  };
}
