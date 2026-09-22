'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getOrderItemKey, getOrderItemLabel } from '@/lib/orderItemName';
import { formatKST } from '@/lib/utils';
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
  pendingDeliveryItems: Record<string, { label: string; qty: number }>;
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

/**
 * 상단 요약(통계카드·상품별 수량·날짜별 현황) 접기/펴기 상태 저장 키.
 * 매장 컴퓨터에 하루 종일 띄워두는 화면이라 새로고침해도 상태가 유지돼야 한다.
 */
const SUMMARY_OPEN_KEY = 'admin_orders_summary_open';

export function AdminOrdersTab(props: AdminOrdersTabProps) {
  const visibleOrders = props.orders.filter((o) => !o.is_hidden);

  // 상단 요약 접기/펴기 — 기본값은 접힘.
  // 서버 렌더와 첫 클라이언트 렌더가 어긋나지 않도록 초기값은 항상 false 로 두고,
  // 마운트된 뒤에 localStorage 에 저장된 값으로 되돌린다.
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    try {
      setSummaryOpen(localStorage.getItem(SUMMARY_OPEN_KEY) === 'true');
    } catch {
      // 시크릿 모드 등으로 localStorage 를 못 읽어도 기본값(접힘)으로 그냥 동작
    }
  }, []);

  const toggleSummary = () => {
    setSummaryOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SUMMARY_OPEN_KEY, String(next));
      } catch {
        // 저장에 실패해도 이번 화면에서는 정상 동작한다
      }
      return next;
    });
  };

  // 예약 주문 통계
  //
  // 모수는 '지금 화면에 보이는 목록'(filteredOrders) 과 똑같이 맞춘다.
  // 예전에는 날짜·단지·상태 필터를 타지 않고 전체 주문을 세는 바람에,
  // 목록에는 2건만 떠 있는데 위 카드에는 243건이 찍혀서 어느 숫자를 믿어야
  // 할지 알 수 없었다. 화면의 두 숫자는 언제나 같은 모수여야 한다.
  const stats = useMemo(() => {
    const listed = props.filteredOrders;
    const paid = listed.filter((o) => o.status === 'PAID' || o.status === 'LATE_DEPOSIT');
    const created = listed.filter((o) => o.status === 'CREATED' || o.status === 'WAITING_FOR_DEPOSIT');
    const totalRevenue = paid.reduce((sum, o) => sum + o.total_amount, 0);

    // 상품별 수량 집계 (결제완료 기준)
    // 캠페인 상품(떡국만두)은 sku 가 비어 있어서 sku 로 묶으면 서로 다른 상품이
    // "null" 한 줄로 합쳐진다. 그래서 상품을 가리는 키와 이름을 공통 함수로 구한다.
    const productQty: Record<string, { label: string; qty: number }> = {};
    paid.forEach((order) => {
      (order.order_items || []).forEach((item) => {
        const key = getOrderItemKey(item);
        if (!productQty[key]) {
          productQty[key] = { label: getOrderItemLabel(item), qty: 0 };
        }
        productQty[key].qty += item.qty;
      });
    });

    return { paid: paid.length, created: created.length, total: listed.length, totalRevenue, productQty };
  }, [props.filteredOrders]);

  // 날짜별 예약 현황 — 여기만 날짜 필터를 타지 않는다.
  //
  // 이 표는 '앞으로 어느 날 몇 건을 준비해야 하나'를 보는 표다. 기본 날짜 필터가
  // 「오늘」이라 위 카드와 같은 모수를 쓰면 오늘 한 줄만 남아 표가 쓸모없어진다.
  // 그래서 날짜 필터만 예외로 두고, 매장 필터(만두 매장만)와 숨김 제외는 그대로
  // 적용된 전체 기간 결제완료 주문을 센다. 기준이 다르다는 것은 표 제목에 적었다.
  const upcomingByDate = useMemo(() => {
    const byDate: Record<string, number> = {};
    visibleOrders
      .filter((o) => o.status === 'PAID' || o.status === 'LATE_DEPOSIT')
      .forEach((order) => {
        const date = order.pickup_date || order.delivery_date;
        if (date) byDate[date] = (byDate[date] || 0) + 1;
      });
    // 접었을 때 한 줄에 남길 "오늘" 건수 (한국 시간 기준, 결제완료 기준)
    // 필터를 「전체 기간」으로 바꿔도 '오늘 나갈 건수'는 그대로여야 하므로
    // 이 숫자도 날짜 필터를 타지 않는다.
    const today = byDate[formatKST(new Date(), 'yyyy-MM-dd')] || 0;
    return { byDate, today };
  }, [visibleOrders]);

  return (
    <>
      {/* 예약 주문 대시보드 — 접기/펴기 (기본 접힘, 상태는 localStorage 에 저장) */}
      <div className="mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={toggleSummary}
          aria-expanded={summaryOpen}
          aria-controls="admin-orders-summary"
          className="w-full h-auto min-h-[52px] justify-between gap-2 whitespace-normal px-4 py-2 text-left"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-green-700 font-bold">결제완료 {stats.paid}</span>
            <span className="text-gray-300">·</span>
            <span className="text-yellow-700 font-bold">결제대기 {stats.created}</span>
            <span className="text-gray-300">·</span>
            <span className="text-blue-700 font-bold">오늘 {upcomingByDate.today}건</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-gray-600">
            {summaryOpen ? '접기' : '펼치기'}
            {summaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </Button>

        <div id="admin-orders-summary" hidden={!summaryOpen} className="mt-3 space-y-3">
          {/* 아래 네 칸과 '상품별 준비 수량'은 지금 목록에 떠 있는 주문만 센다 */}
          <p className="text-xs text-gray-500">아래 숫자는 지금 목록에 보이는 주문 기준입니다</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-orange-700">매출</p>
                <p className="text-2xl font-bold text-orange-700">{stats.totalRevenue.toLocaleString()}원</p>
              </CardContent>
            </Card>
          </div>

          {/* 상품별 수량(목록 기준) + 날짜별 주문(전체 기간 기준) — 기준이 달라서 각각 적어 둔다 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.paid > 0 && (
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-sm font-bold text-gray-700">상품별 준비 수량</p>
                  <p className="text-xs text-gray-500 mb-2">지금 목록 · 결제완료 기준</p>
                  <div className="space-y-1">
                    {Object.entries(stats.productQty).map(([key, entry]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span>{entry.label}</span>
                        <span className="font-bold">{entry.qty}개</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {Object.keys(upcomingByDate.byDate).length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-sm font-bold text-gray-700">날짜별 예약 현황</p>
                  <p className="text-xs text-gray-500 mb-2">
                    날짜 필터와 무관 · 전체 기간 결제완료 기준
                  </p>
                  <div className="space-y-1">
                    {Object.entries(upcomingByDate.byDate)
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
            )}
          </div>
        </div>
      </div>

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
