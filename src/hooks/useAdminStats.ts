/**
 * 관리자 통계 조회 훅
 * 
 * 통계 API를 호출하여 상품별/매출/배송일별 통계를 조회합니다.
 * 출하 수량 수정 기능도 포함합니다.
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================
// 타입 정의
// ============================================

export interface ProductStat {
  name: string;
  emoji: string;
  totalQty: number;
  totalRevenue: number;
  byApt: Record<string, number>;
  shipmentByDate: Record<string, number>;
}

export interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  totalDiscount: number;
  netRevenue: number;
  byApt: Record<string, { revenue: number; orders: number; name: string }>;
  byProduct: Record<string, { revenue: number; qty: number }>;
  byStatus: {
    paid: number;
    waitingDeposit: number;
    delivered: number;
    refunded: number;
  };
  byDeliveryMethod: {
    delivery: { revenue: number; orders: number };
    pickup: { revenue: number; orders: number };
  };
}

export interface StatsData {
  products: Record<string, ProductStat>;
  sales: SalesStats;
  calendar: Record<string, Record<string, number>>;
  shipmentDates: string[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// ============================================
// 훅 구현
// ============================================

export function useAdminStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '2026-02-01',
    endDate: '2026-02-15',
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const adminPassword = typeof window !== 'undefined'
        ? sessionStorage.getItem('admin_password') || ''
        : '';

      const params = new URLSearchParams();
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);

      const response = await fetch(`/api/admin/stats?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-admin-password': adminPassword,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '통계 조회에 실패했습니다.');
      }

      setStats({
        products: data.products,
        sales: data.sales,
        calendar: data.calendar,
        shipmentDates: data.shipmentDates,
      });
    } catch (err: any) {
      console.error('[useAdminStats] Fetch error:', err);
      setError(err.message || '통계 조회 중 오류가 발생했습니다.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // 날짜 범위 변경 시 자동 조회 (인증된 경우에만)
  useEffect(() => {
    const adminPassword = typeof window !== 'undefined'
      ? sessionStorage.getItem('admin_password')
      : null;
    if (adminPassword) {
      fetchStats();
    }
  }, [fetchStats]);

  // 출하 수량 수정
  const updateShipmentQuantity = useCallback(async (
    sku: string,
    date: string,
    quantity: number
  ): Promise<boolean> => {
    try {
      const adminPassword = typeof window !== 'undefined'
        ? sessionStorage.getItem('admin_password') || ''
        : '';

      const response = await fetch('/api/admin/stats/shipment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ sku, date, quantity }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '출하 수량 저장에 실패했습니다.');
      }

      // 로컬 상태 업데이트 (전체 리패치 없이)
      setStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          products: {
            ...prev.products,
            [sku]: {
              ...prev.products[sku],
              shipmentByDate: {
                ...prev.products[sku].shipmentByDate,
                [date]: quantity,
              },
            },
          },
        };
      });

      return true;
    } catch (err: any) {
      console.error('[useAdminStats] Update shipment error:', err);
      return false;
    }
  }, []);

  return {
    stats,
    loading,
    error,
    dateRange,
    setDateRange,
    fetchStats,
    updateShipmentQuantity,
  };
}
