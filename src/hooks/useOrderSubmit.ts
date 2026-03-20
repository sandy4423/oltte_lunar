/**
 * 주문 제출 훅
 *
 * 전골 이벤트 픽업 주문 전용.
 * 주문 생성 후 createdOrderId / finalAmount를 반환하면
 * 호출 측에서 토스페이먼츠 카드 결제를 처리합니다.
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PRODUCTS,
  DANGOL_DISCOUNT_PER_ITEM,
  DANGOL_DISCOUNT_ELIGIBLE_SKUS,
  EVENT_APT_CODE,
  getOrderCutoffForDate,
} from '@/lib/constants';
import { getStoredSource } from '@/lib/sourceTracking';
import type { CartItem } from '@/types/order';

interface UseOrderSubmitParams {
  phone: string;
  name: string;
  personalInfoConsent: boolean;
  marketingOptIn: boolean;
  cart: CartItem[];
  totalQty: number;
  totalAmount: number;
  pickupDate: string;
  pickupTime: string;
}

export function useOrderSubmit(params: UseOrderSubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [finalAmount, setFinalAmount] = useState<number>(0);

  const handleSubmit = async () => {
    const {
      phone, name, personalInfoConsent, marketingOptIn,
      cart, totalQty, totalAmount, pickupDate, pickupTime,
    } = params;

    if (!phone || !name || !pickupDate || !pickupTime) {
      setError('필수 정보를 모두 입력해주세요.');
      return;
    }
    if (!personalInfoConsent) {
      setError('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPhone = phone.replace(/-/g, '');
      const source = getStoredSource();

      // 단골톡방 할인 계산
      let dangolDiscount = 0;
      if (source === 'dangol') {
        cart.forEach((item) => {
          if ((DANGOL_DISCOUNT_ELIGIBLE_SKUS as readonly string[]).includes(item.sku)) {
            dangolDiscount += DANGOL_DISCOUNT_PER_ITEM * item.qty;
          }
        });
      }
      const computed = totalAmount - dangolDiscount;

      // 고객 생성/조회
      let customerId: string;

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({ phone: normalizedPhone, name, marketing_opt_in: marketingOptIn })
          .select('id')
          .single();

        if (customerError || !newCustomer) throw new Error('고객 정보 저장 실패');
        customerId = newCustomer.id;
      }

      // 주문 생성
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          status: 'CREATED',
          total_qty: totalQty,
          total_amount: computed,
          payment_method: 'card',
          source,
          apt_code: EVENT_APT_CODE,
          apt_name: '전골이벤트',
          dong: '-',
          ho: '-',
          delivery_date: pickupDate,
          cutoff_at: getOrderCutoffForDate(pickupDate),
          is_pickup: true,
          pickup_discount: 0,
          dangol_discount: dangolDiscount,
          pickup_date: pickupDate,
          pickup_time: pickupTime,
        })
        .select('id')
        .single();

      if (orderError || !order) throw new Error('주문 생성 실패');

      // 주문 상품 생성
      const orderItems = cart
        .filter((item) => item.qty > 0)
        .map((item) => {
          const product = PRODUCTS.find((p) => p.sku === item.sku)!;
          return {
            order_id: order.id,
            sku: item.sku,
            qty: item.qty,
            unit_price: product.price,
            line_amount: product.price * item.qty,
          };
        });

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw new Error('주문 상품 저장 실패');

      setFinalAmount(computed);
      setCreatedOrderId(order.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '주문 처리 중 오류가 발생했습니다.';
      setError(msg);

      try {
        await fetch('/api/error-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorType: '전골 주문 제출 오류',
            errorMessage: msg,
            customerName: params.name,
            customerPhone: params.phone,
          }),
        });
      } catch { /* ignore */ }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    setError,
    handleSubmit,
    createdOrderId,
    finalAmount,
  };
}
