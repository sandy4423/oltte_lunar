/**
 * 장바구니 훅
 * 
 * 상품 수량 관리, 총 수량/금액 계산, 최소 주문 충족 여부를 처리합니다.
 */

import { useState, useMemo } from 'react';
import { PRODUCTS, MIN_ORDER_QUANTITY, FREE_SHIPPING_ELIGIBLE_SKUS, type Product } from '@/lib/constants';
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
  const { totalQty, totalAmount, eligibleQty } = useMemo(() => {
    let qty = 0;
    let amount = 0;
    let eligible = 0;  // 무료배송 대상 수량
    
    cart.forEach((item: CartItem) => {
      const product = PRODUCTS.find((p) => p.sku === item.sku);
      if (product) {
        qty += item.qty;
        amount += product.price * item.qty;
        
        // 만두, 떡만 무료배송 조건에 카운트
        if (FREE_SHIPPING_ELIGIBLE_SKUS.includes(item.sku as any)) {
          eligible += item.qty;
        }
      }
    });
    
    return { totalQty: qty, totalAmount: amount, eligibleQty: eligible };
  }, [cart]);

  // 최소 주문 충족 여부 (무료배송 대상 수량 기준)
  const isMinOrderMet = eligibleQty >= MIN_ORDER_QUANTITY;

  return {
    cart,
    updateQuantity,
    totalQty,        // 전체 수량 (모든 상품)
    totalAmount,
    isMinOrderMet,   // 만두+떡만으로 3개 이상인지
    eligibleQty,     // 무료배송 대상 수량 (만두+떡)
  };
}
