'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { getProductBySku } from '@/lib/constants';
import { OrderFiltersAndActions } from './OrderFiltersAndActions';
import { OrderMobileCards } from './OrderMobileCards';
import { OrderDesktopTable } from './OrderDesktopTable';
import type { OrderFull } from '@/types/database';

interface AdminOrdersTabProps {
  orders: OrderFull[];
  filteredOrders: OrderFull[];
  loading: boolean;
  pageStats: any;
  orderStats: any;
  showPageStats: boolean;
  setShowPageStats: (v: boolean) => void;
  showSourceAnalysis: boolean;
  setShowSourceAnalysis: (v: boolean) => void;
  pendingDeliveryItems: Record<string, number>;
  pendingDeliveryOrderCount: number;
  filterApt: string;
  setFilterApt: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterDeliveryDate: string;
  setFilterDeliveryDate: (v: string) => void;
  filterDeliveryMethod: string;
  setFilterDeliveryMethod: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortOrder: string;
  setSortOrder: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showHidden: boolean;
  uniqueDeliveryDates: string[];
  selectedOrders: Set<string>;
  handleSelectAll: (checked: boolean, orders: OrderFull[]) => void;
  handleSelectOrder: (id: string, checked: boolean) => void;
  selectedRowId: string | null;
  setSelectedRowId: (id: string | null) => void;
  actionLoading: boolean;
  remindLoading: boolean;
  sendLinkLoading: boolean;
  canSendPickupLink: boolean;
  handleStatusChange: (status: string) => void;
  handleRemindDeposit: () => void;
  handleSendPickupTimeLink: () => void;
  handleOpenCancelDialog: () => void;
  handleHideOrders: (hidden: boolean) => void;
  handlePrintMode: () => void;
  handleOpenDetail: (order: any) => void;
}

export function AdminOrdersTab(props: AdminOrdersTabProps) {
  const visibleOrders = props.orders.filter((o) => !o.is_hidden);

  // 예약 주문 통계
  const stats = useMemo(() => {
    const paid = visibleOrders.filter((o) => o.status === 'PAID' || o.status === 'LATE_DEPOSIT');
    const created = visibleOrders.filter((o) => o.status === 'CREATED' || o.status === 'WAITING_FOR_DEPOSIT');
    const totalRevenue = paid.reduce((sum, o) => sum + o.total_amount, 0);

    // 상품별 수량 집계 (결제완료 기준)
    const productQty: Record<string, number> = {};
    paid.forEach((order) => {
      order.order_items.forEach((item) => {
        productQty[item.sku] = (productQty[item.sku] || 0) + item.qty;
      });
    });

    // 날짜별 주문 수
    const byDate: Record<string, number> = {};
    paid.forEach((order) => {
      const date = order.pickup_date || order.delivery_date;
      byDate[date] = (byDate[date] || 0) + 1;
    });

    return { paid: paid.length, created: created.length, totalRevenue, productQty, byDate };
  }, [visibleOrders]);

  return (
    <>
      {/* 예약 주문 대시보드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-green-700">결제완료</p>
            <p className="text-3xl font-bold text-green-700">{stats.paid}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-yellow-700">결제대기</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.created}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-blue-700">전체 주문</p>
            <p className="text-3xl font-bold text-blue-700">{visibleOrders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-orange-700">매출</p>
            <p className="text-2xl font-bold text-orange-700">{stats.totalRevenue.toLocaleString()}원</p>
          </CardContent>
        </Card>
      </div>

      {/* 상품별 수량 + 날짜별 주문 (결제완료 기준) */}
      {stats.paid > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm font-bold text-gray-700 mb-2">상품별 준비 수량</p>
              <div className="space-y-1">
                {Object.entries(stats.productQty).map(([sku, qty]) => {
                  const product = getProductBySku(sku);
                  return (
                    <div key={sku} className="flex justify-between text-sm">
                      <span>{product ? `${product.emoji} ${product.name}` : sku}</span>
                      <span className="font-bold">{qty}개</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm font-bold text-gray-700 mb-2">날짜별 예약 현황</p>
              <div className="space-y-1">
                {Object.entries(stats.byDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, count]) => (
                    <div key={date} className="flex justify-between text-sm">
                      <span>{format(new Date(date + 'T00:00:00'), 'M월 d일 (EEE)', { locale: ko })}</span>
                      <span className="font-bold">{count}건</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <OrderFiltersAndActions
        filterApt={props.filterApt}
        setFilterApt={props.setFilterApt}
        filterStatus={props.filterStatus}
        setFilterStatus={props.setFilterStatus}
        filterDeliveryDate={props.filterDeliveryDate}
        setFilterDeliveryDate={props.setFilterDeliveryDate}
        filterDeliveryMethod={props.filterDeliveryMethod}
        setFilterDeliveryMethod={props.setFilterDeliveryMethod}
        sortBy={props.sortBy}
        setSortBy={props.setSortBy}
        sortOrder={props.sortOrder}
        setSortOrder={props.setSortOrder}
        searchQuery={props.searchQuery}
        setSearchQuery={props.setSearchQuery}
        showHidden={props.showHidden}
        uniqueDeliveryDates={props.uniqueDeliveryDates}
        selectedOrdersCount={props.selectedOrders.size}
        filteredOrdersCount={props.filteredOrders.length}
        actionLoading={props.actionLoading}
        remindLoading={props.remindLoading}
        sendLinkLoading={props.sendLinkLoading}
        canSendPickupLink={props.canSendPickupLink}
        onRemindDeposit={props.handleRemindDeposit}
        onSendPickupTimeLink={props.handleSendPickupTimeLink}
        onStatusChange={props.handleStatusChange}
        onOpenCancelDialog={props.handleOpenCancelDialog}
        onHideOrders={props.handleHideOrders}
        onPrintMode={props.handlePrintMode}
      />

      <OrderMobileCards
        filteredOrders={props.filteredOrders}
        loading={props.loading}
        selectedOrders={props.selectedOrders}
        onSelectOrder={props.handleSelectOrder}
        onOpenDetail={props.handleOpenDetail}
      />

      <OrderDesktopTable
        filteredOrders={props.filteredOrders}
        loading={props.loading}
        selectedOrders={props.selectedOrders}
        selectedRowId={props.selectedRowId}
        onSelectAll={props.handleSelectAll}
        onSelectOrder={props.handleSelectOrder}
        onRowClick={(orderId) => props.setSelectedRowId(props.selectedRowId === orderId ? null : orderId)}
        onOpenDetail={(order) => {
          props.handleOpenDetail(order);
          props.setSelectedRowId(null);
        }}
      />

      <div className="mt-6 text-center text-sm text-gray-400">
        총 {props.filteredOrders.length}건 / 선택 {props.selectedOrders.size}건
      </div>
    </>
  );
}
