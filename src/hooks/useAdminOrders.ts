/**
 * 관리자 주문 조회 훅
 * 
 * 서버 API를 통해 주문 목록을 조회하고 관리합니다.
 */

import { useState } from 'react';
import type { OrderFull } from '@/types/database';

export function useAdminOrders() {
  const [orders, setOrders] = useState<OrderFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const adminPassword = typeof window !== 'undefined' ? sessionStorage.getItem('admin_password') || '' : '';
      const response = await fetch('/api/admin/orders', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-admin-password': adminPassword,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data || []);
        setLastFetchTime(data.timestamp);
      } else {
        console.error('API error:', data.error);
        setOrders([]);
        setLastFetchTime(null);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
      setOrders([]);
      setLastFetchTime(null);
    } finally {
      setLoading(false);
    }
  };

  // 마운트 시 자동 호출 제거 - admin/page.tsx에서 isAuthenticated 변경 시 호출
  
  return {
    orders,
    loading,
    fetchOrders,
    lastFetchTime,
  };
}