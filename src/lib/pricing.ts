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
