/**
 * 장바구니 훅
 * 
 * 상품 수량 관리, 총 수량/금액 계산, 최소 주문 충족 여부를 처리합니다.
 */

import { useState, useMemo } from 'react';
import { PRODUCTS, MIN_ORDER_QUANTITY, type Product } from '@/lib/constants';
import type { CartItem } from '@/types/order';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(
    PRODUCTS.map((p) => ({ sku: p.sku, qty: 0 }))
  );

  // 수량 변경
  const updateQuantity = (sku: Product['sku'], delta: number) => {
    setCart((prev: CartItem[]) =>
      prev.map((item: CartItem) =>
        item.sku === sku
          ? { ...item, qty: Math.max(0, item.qty + delta) }
          : item
      )
    );
  };

  // 총 수량 & 금액 계산
  const { totalQty, totalAmount } = useMemo(() => {
    let qty = 0;
    let amount = 0;
    cart.forEach((item: CartItem) => {
      const product = PRODUCTS.find((p) => p.sku === item.sku);
      if (product) {
        qty += item.qty;
        amount += product.price * item.qty;
      }
    });
    return { totalQty: qty, totalAmount: amount };
  }, [cart]);

  // 최소 주문 충족 여부
  const isMinOrderMet = totalQty >= MIN_ORDER_QUANTITY;

  return {
    cart,
    updateQuantity,
    totalQty,
    totalAmount,
    isMinOrderMet,
  };
}
