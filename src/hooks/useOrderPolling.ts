/**
 * 주문 폴링 훅
 * 
 * 주문 정보를 조회하고, 가상계좌 발급 완료까지 5초마다 폴링합니다.
 * 가상계좌 번호가 발급되면 폴링을 중단합니다.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { OrderWithCustomer } from '@/types/database';

export function useOrderPolling(orderId: string | null) {
  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

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

        if (cancelled) return;

        if (fetchError || !data) {
          throw new Error('주문 정보 조회 실패');
        }

        setOrder(data as OrderWithCustomer);

        // 가상계좌 번호가 발급되었거나, 결제 완료 상태이면 폴링 중단
        if (data.vbank_num || data.status === 'PAID' || data.status === 'AUTO_CANCELED') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Fetch order error:', err);
        setError('주문 정보를 불러올 수 없습니다.');
        // 에러 발생 시에도 폴링 중단
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOrder();

    // 5초마다 가상계좌 정보 폴링 (발급 완료 확인)
    intervalRef.current = setInterval(fetchOrder, 5000);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [orderId]);

  return {
    order,
    loading,
    error,
  };
}
