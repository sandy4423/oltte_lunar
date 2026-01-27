/**
 * 관리자 주문 조회 훅
 * 
 * 주문 목록을 Supabase에서 조회하고 관리합니다.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { OrderFull } from '@/types/database';

export function useAdminOrders() {
  const [orders, setOrders] = useState<OrderFull[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(*), order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as OrderFull[]) || []);
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
  };
}
