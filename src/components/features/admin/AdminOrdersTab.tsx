'use client';

import { PageVisitStats } from './PageVisitStats';
import { SourceAnalysis } from './SourceAnalysis';
import { OrderSummaryCards } from './OrderSummaryCards';
import { PendingDeliveryCard } from './PendingDeliveryCard';
import { OrderFiltersAndActions } from './OrderFiltersAndActions';
import { OrderMobileCards } from './OrderMobileCards';
import { OrderDesktopTable } from './OrderDesktopTable';
import type { OrderFull } from '@/types/database';

interface AdminOrdersTabProps {
  orders: OrderFull[];
  filteredOrders: OrderFull[];
  loading: boolean;

  // 통계
  pageStats: any;
  orderStats: any;
  showPageStats: boolean;
  setShowPageStats: (v: boolean) => void;
  showSourceAnalysis: boolean;
  setShowSourceAnalysis: (v: boolean) => void;

  // 전달 필요
  pendingDeliveryItems: Record<string, number>;
  pendingDeliveryOrderCount: number;

  // 필터
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

  // 선택
  selectedOrders: Set<string>;
  handleSelectAll: (checked: boolean, orders: OrderFull[]) => void;
  handleSelectOrder: (id: string, checked: boolean) => void;
  selectedRowId: string | null;
  setSelectedRowId: (id: string | null) => void;

  // 액션
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
  return (
    <>
      <PageVisitStats
        pageStats={props.pageStats}
        showPageStats={props.showPageStats}
        onToggle={() => props.setShowPageStats(!props.showPageStats)}
      />

      <SourceAnalysis
        pageStats={props.pageStats}
        orderStats={props.orderStats}
        showSourceAnalysis={props.showSourceAnalysis}
        onToggle={() => props.setShowSourceAnalysis(!props.showSourceAnalysis)}
      />

      <OrderSummaryCards orders={props.orders} />

      <PendingDeliveryCard
        pendingDeliveryItems={props.pendingDeliveryItems}
        pendingDeliveryOrderCount={props.pendingDeliveryOrderCount}
      />

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
