/**
 * 주문 제출 훅
 * 
 * 주문 생성, DB 저장, 토스페이먼츠 가상계좌 발급을 처리합니다.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PRODUCTS, getApartmentFullName } from '@/lib/constants';
import type { CartItem } from '@/types/order';
import type { ApartmentConfig } from '@/lib/constants';

interface UseOrderSubmitParams {
  apartment: ApartmentConfig | null;
  phone: string;
  name: string;
  dong: string;
  ho: string;
  personalInfoConsent: boolean;
  marketingOptIn: boolean;
  cart: CartItem[];
  totalQty: number;
  totalAmount: number;
}

export function useOrderSubmit(params: UseOrderSubmitParams) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const { apartment, phone, name, dong, ho, personalInfoConsent, marketingOptIn, cart, totalQty, totalAmount } = params;
    
    if (!apartment) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPhone = phone.replace(/-/g, '');

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
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          apt_code: apartment.code,
          apt_name: getApartmentFullName(apartment),
          dong: dong,
          ho: ho,
          delivery_date: apartment.deliveryDate,
          cutoff_at: apartment.cutoffAt,
          status: 'CREATED',
          total_qty: totalQty,
          total_amount: totalAmount,
          payment_method: 'vbank',
        })
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
          amount: totalAmount,
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
      setError(err instanceof Error ? err.message : '주문 처리 중 오류가 발생했습니다.');
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
