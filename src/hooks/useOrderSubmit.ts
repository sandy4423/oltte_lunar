/**
 * 주문 제출 훅
 * 
 * 주문 생성, DB 저장, PortOne 결제 연동을 처리합니다.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PRODUCTS } from '@/lib/constants';
import type { CartItem } from '@/types/order';

interface UseOrderSubmitParams {
  apartment: {
    code: string;
    name: string;
    deliveryDate: string;
    cutoffAt: string;
  } | null;
  phone: string;
  name: string;
  dong: string;
  ho: string;
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
    const { apartment, phone, name, dong, ho, marketingOptIn, cart, totalQty, totalAmount } = params;
    
    if (!apartment) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPhone = phone.replace(/-/g, '');

      // 1. 고객 생성 또는 조회
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
          apt_name: apartment.name,
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

      // 4. PortOne 결제 요청
      const { default: PortOne } = await import('@portone/browser-sdk/v2');

      const paymentResponse = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId: `payment_${order.id}_${Date.now()}`,
        orderName: `올때만두 - ${apartment.name}`,
        totalAmount: totalAmount,
        currency: 'CURRENCY_KRW',
        payMethod: 'VIRTUAL_ACCOUNT',
        virtualAccount: {
          accountExpiry: {
            validHours: Math.max(1, Math.floor((new Date(apartment.cutoffAt).getTime() - Date.now()) / (1000 * 60 * 60))),
          },
        },
        customer: {
          phoneNumber: normalizedPhone,
          fullName: name,
        },
        customData: {
          orderId: order.id,
          aptCode: apartment.code,
        },
      });

      if (paymentResponse?.code) {
        // 결제 실패
        throw new Error(paymentResponse.message || '결제 요청 실패');
      }

      // 5. 결제 정보 업데이트
      if (paymentResponse?.paymentId) {
        await supabase
          .from('orders')
          .update({
            portone_payment_id: paymentResponse.paymentId,
            status: 'WAITING_FOR_DEPOSIT',
            vbank_bank: '가상계좌 정보 확인 중',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      }

      // 6. 완료 페이지로 이동
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
