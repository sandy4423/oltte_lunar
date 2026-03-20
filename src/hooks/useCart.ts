/**
 * 장바구니 훅
 *
 * 상품 수량 관리 및 총 수량/금액 계산
 */

import { useState, useMemo } from 'react';
import { PRODUCTS, DANGOL_DISCOUNT_PER_ITEM, DANGOL_DISCOUNT_ELIGIBLE_SKUS, type Product } from '@/lib/constants';
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

  /** 단골톡방 할인 금액 계산 (전골 2종만 적용) */
  const calcDangolDiscount = (isDangol: boolean): number => {
    if (!isDangol) return 0;
    return cart.reduce((acc, item) => {
      if ((DANGOL_DISCOUNT_ELIGIBLE_SKUS as readonly string[]).includes(item.sku)) {
        return acc + DANGOL_DISCOUNT_PER_ITEM * item.qty;
      }
      return acc;
    }, 0);
  };

  const hasItems = totalQty > 0;

  return {
    cart,
    updateQuantity,
    totalQty,
    totalAmount,
    hasItems,
    calcDangolDiscount,
  };
}
