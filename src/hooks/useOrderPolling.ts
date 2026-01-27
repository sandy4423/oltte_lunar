/**
 * 주문 폴링 훅
 * 
 * 주문 정보를 조회하고, 가상계좌 발급 완료까지 5초마다 폴링합니다.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { OrderWithCustomer } from '@/types/database';

export function useOrderPolling(orderId: string | null) {
  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setError('주문 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*, customer:customers(*)')
          .eq('id', orderId)
          .single();

        if (fetchError || !data) {
          throw new Error('주문 정보 조회 실패');
        }

        setOrder(data as OrderWithCustomer);
      } catch (err) {
        console.error('Fetch order error:', err);
        setError('주문 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();

    // 5초마다 가상계좌 정보 폴링 (발급 완료 확인)
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  return {
    order,
    loading,
    error,
  };
}
