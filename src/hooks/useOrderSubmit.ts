/**
 * 주문 제출 훅
 * 
 * 주문 생성, DB 저장, 토스페이먼츠 가상계좌 발급을 처리합니다.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PRODUCTS, getApartmentFullName, PICKUP_DISCOUNT, PICKUP_APT_CODE, PICKUP_CONFIG } from '@/lib/constants';
import { getStoredSource } from '@/lib/sourceTracking';
import type { CartItem } from '@/types/order';
import type { ApartmentConfig } from '@/lib/constants';

interface UseOrderSubmitParams {
  apartment?: ApartmentConfig | null;
  phone: string;
  name: string;
  dong?: string;
  ho?: string;
  personalInfoConsent: boolean;
  marketingOptIn: boolean;
  cart: CartItem[];
  totalQty: number;
  totalAmount: number;
  pickupDate?: string;
  pickupTime?: string;
}

export function useOrderSubmit(params: UseOrderSubmitParams) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (isPickup: boolean = false) => {
    const { apartment, phone, name, dong, ho, personalInfoConsent, marketingOptIn, cart, totalQty, totalAmount, pickupDate, pickupTime } = params;
    
    // 픽업 주문인 경우: apartment가 없어도 진행 가능
    // 일반 주문인 경우: apartment 필수
    const isPickupOrder = !apartment && pickupDate && pickupTime;
    
    if (!apartment && !isPickupOrder) {
      setError('주문 정보가 올바르지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPhone = phone.replace(/-/g, '');
      
      // 픽업 주문이거나 픽업 선택 시 할인 적용
      const pickupDiscount = (isPickup || isPickupOrder) ? PICKUP_DISCOUNT : 0;
      const finalAmount = totalAmount - pickupDiscount;

      // 유입 경로 가져오기
      const source = getStoredSource();

      // 1. 고객 생성 또는 조회
      let customerId: string;
      
      // 기존 고객 조회 또는 생성
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
          .insert({
            phone: normalizedPhone,
            name: name,
            marketing_opt_in: marketingOptIn,
          })
          .select('id')
          .single();

        if (customerError || !newCustomer) {
          throw new Error('고객 정보 저장 실패');
        }
        customerId = newCustomer.id;
      }

      // 2. 주문 생성
      const orderData: Record<string, unknown> = {
        customer_id: customerId,
        status: 'CREATED',
        total_qty: totalQty,
        total_amount: finalAmount,
        payment_method: 'vbank',
        source: source,
      };

      // 픽업 전용 주문
      if (isPickupOrder) {
        orderData.apt_code = PICKUP_APT_CODE;
        orderData.apt_name = PICKUP_CONFIG.name;
        orderData.dong = '-';
        orderData.ho = '-';
        orderData.delivery_date = PICKUP_CONFIG.deliveryDate;
        orderData.cutoff_at = PICKUP_CONFIG.cutoffAt;
        orderData.is_pickup = true;
        orderData.pickup_discount = pickupDiscount;
        orderData.pickup_date = pickupDate;
        orderData.pickup_time = pickupTime;
      } 
      // 일반 주문
      else if (apartment) {
        orderData.apt_code = apartment.code;
        orderData.apt_name = getApartmentFullName(apartment);
        orderData.dong = dong || '-';
        orderData.ho = ho || '-';
        orderData.delivery_date = apartment.deliveryDate;
        orderData.cutoff_at = apartment.cutoffAt;
        orderData.is_pickup = isPickup;
        orderData.pickup_discount = pickupDiscount;
        if (isPickup && pickupDate && pickupTime) {
          orderData.pickup_date = pickupDate;
          orderData.pickup_time = pickupTime;
        }
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('id')
        .single();

      if (orderError || !order) {
        throw new Error('주문 생성 실패');
      }

      // 3. 주문 상품 생성
      const orderItems = cart
        .filter((item: CartItem) => item.qty > 0)
        .map((item: CartItem) => {
          const product = PRODUCTS.find((p) => p.sku === item.sku)!;
          return {
            order_id: order.id,
            sku: item.sku,
            qty: item.qty,
            unit_price: product.price,
            line_amount: product.price * item.qty,
          };
        });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw new Error('주문 상품 저장 실패');
      }

      // 4. 토스페이먼츠 가상계좌 발급 (서버 API 호출)
      const vbankResponse = await fetch('/api/payments/virtual-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          amount: finalAmount,
          customerName: name,
          customerPhone: normalizedPhone,
          bank: '20', // 우리은행 (기본값)
        }),
      });

      if (!vbankResponse.ok) {
        const errorData = await vbankResponse.json();
        throw new Error(errorData.error || '가상계좌 발급 실패');
      }

      const vbankData = await vbankResponse.json();
      
      if (!vbankData.success) {
        throw new Error(vbankData.error || '가상계좌 발급 실패');
      }

      console.log('[Order] Virtual account issued:', vbankData);

      // 5. 완료 페이지로 이동
      router.push(`/order/complete?orderId=${order.id}`);
    } catch (err) {
      console.error('Order error:', err);
      const errorMessage = err instanceof Error ? err.message : '주문 처리 중 오류가 발생했습니다.';
      setError(errorMessage);
      
      // Slack 에러 알림
      try {
        await fetch('/api/error-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorType: '주문 제출 오류',
            errorMessage: errorMessage,
            customerName: name,
            customerPhone: phone,
            aptName: apartment ? getApartmentFullName(apartment) : (isPickupOrder ? PICKUP_CONFIG.name : undefined),
          }),
        });
      } catch (alertError) {
        console.error('[Error Alert]', alertError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    setError,
    handleSubmit,
  };
}
