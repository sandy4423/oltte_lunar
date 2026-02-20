'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangeFilter } from '@/components/features/admin/stats/DateRangeFilter';
import { ProductStats } from '@/components/features/admin/stats/ProductStats';
import { SalesStats } from '@/components/features/admin/stats/SalesStats';
import { DeliveryCalendar } from '@/components/features/admin/stats/DeliveryCalendar';

interface AdminStatsTabProps {
  stats: any;
  loading: boolean;
  error: string | null;
  dateRange: any;
  setDateRange: (v: any) => void;
  fetchStats: () => void;
  updateShipmentQuantity: (...args: any[]) => void;
}

export function AdminStatsTab({
  stats, loading, error, dateRange, setDateRange, fetchStats, updateShipmentQuantity,
}: AdminStatsTabProps) {
  return (
    <>
      <DateRangeFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        loading={loading}
      />

      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">통계 데이터를 불러오는 중...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStats} className="mt-2">
            다시 시도
          </Button>
        </div>
      )}

      {stats && !loading && (
        <>
          <ProductStats
            products={stats.products}
            shipmentDates={stats.shipmentDates}
            onUpdateShipment={updateShipmentQuantity}
          />
          <SalesStats sales={stats.sales} />
          <DeliveryCalendar calendar={stats.calendar} />
        </>
      )}

      {!stats && !loading && !error && (
        <div className="text-center py-12 text-gray-400">
          통계 데이터가 없습니다.
        </div>
      )}
    </>
  );
}
