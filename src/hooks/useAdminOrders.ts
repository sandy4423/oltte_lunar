/**
 * 관리자 주문 조회 훅
 * 
 * 서버 API를 통해 주문 목록을 조회하고 관리합니다.
 */

import { useState, useEffect } from 'react';
import type { OrderFull } from '@/types/database';

export function useAdminOrders() {
  const [orders, setOrders] = useState<OrderFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/orders');
      
      if (!response.ok) {
        throw new Error('주문 목록 조회에 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data || []);
        setLastFetchTime(data.timestamp);
      } else {
        console.error('API error:', data.error);
        setOrders([]);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders,
    loading,
    fetchOrders,
    lastFetchTime,
  };
}
