/**
 * 장바구니 훅
 *
 * 상품 수량 관리 및 총 수량/금액 계산
 */

import { useState, useMemo } from 'react';
import { PRODUCTS, DANGOL_DISCOUNT_ELIGIBLE_SKUS, type Product } from '@/lib/constants';
import { calculateDangolDiscount } from '@/lib/pricing';
import type { CartItem } from '@/types/order';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(
    PRODUCTS.map((p) => ({ sku: p.sku, qty: 0 }))
  );

  const updateQuantity = (sku: Product['sku'], delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.sku === sku ? { ...item, qty: Math.max(0, item.qty + delta) } : item
      )
    );
  };

  const { totalQty, totalAmount } = useMemo(() => {
    let qty = 0;
    let amount = 0;

    cart.forEach((item) => {
      const product = PRODUCTS.find((p) => p.sku === item.sku);
      if (product) {
        qty += item.qty;
        amount += product.price * item.qty;
      }
    });

    return { totalQty: qty, totalAmount: amount };
  }, [cart]);

  /** 단골톡방 할인 금액 계산 — src/lib/pricing.ts 공유 함수 위임 */
  const calcDangolDiscount = (isDangol: boolean): number =>
    calculateDangolDiscount(cart, isDangol);

  /** 전골(메인 상품) 수량 */
  const hotpotQty = useMemo(() => {
    return cart.reduce((acc, item) => {
      if ((DANGOL_DISCOUNT_ELIGIBLE_SKUS as readonly string[]).includes(item.sku)) {
        return acc + item.qty;
      }
      return acc;
    }, 0);
  }, [cart]);

  const hasItems = totalQty > 0;

  return {
    cart,
    updateQuantity,
    totalQty,
    totalAmount,
    hasItems,
    hotpotQty,
    calcDangolDiscount,
  };
}
