/**
 * 주문 관련 타입 정의
 */

import type { Product } from '@/lib/constants';

/**
 * 장바구니 아이템
 */
export interface CartItem {
  sku: Product['sku'];
  qty: number;
}
