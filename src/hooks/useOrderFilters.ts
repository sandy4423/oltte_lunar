/**
 * 주문 필터링 훅
 * 
 * 단지, 배송일, 상태, 검색어로 주문을 필터링합니다.
 */

import { useState, useMemo } from 'react';
import type { OrderFull } from '@/types/database';
import { PICKUP_APT_CODE } from '@/lib/constants';

/** 주문의 수령날짜(픽업은 pickup_date, 배달은 delivery_date) */
function getReceiveDate(order: Pick<OrderFull, 'is_pickup' | 'pickup_date' | 'delivery_date'>): string {
  return order.is_pickup && order.pickup_date ? order.pickup_date : order.delivery_date;
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function getTodayKST(): string {
  const now = new Date();
  // 로컬 타임존 사용 — 관리자 PC가 항상 KST라는 가정
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useOrderFilters(orders: OrderFull[]) {
  const [filterApt, setFilterApt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('PAID');
  const [filterDeliveryDate, setFilterDeliveryDate] = useState<string>('today');
  const [filterDeliveryMethod, setFilterDeliveryMethod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('delivery_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState<boolean>(false);

  // 필터링 및 정렬된 주문
  const filteredOrders = useMemo(() => {
    const today = getTodayKST();

    const filtered = orders.filter((order) => {
      // 숨긴 주문 토글: showHidden이 false면 숨긴 주문 제외
      if (!showHidden && order.is_hidden) return false;
      // showHidden이 true면 숨긴 주문만 표시
      if (showHidden && !order.is_hidden) return false;

      // 일반 필터
      if (filterStatus !== 'all' && order.status !== filterStatus) return false;
      if (filterApt !== 'all') {
        if (filterApt === PICKUP_APT_CODE) {
          // 픽업주문 필터: is_pickup 기준으로 판별
          if (!order.is_pickup) return false;
        } else {
          if (order.apt_code !== filterApt) return false;
        }
      }

      // 수령날짜 필터 — 픽업은 pickup_date, 배달은 delivery_date로 비교
      if (filterDeliveryDate !== 'all') {
        const receiveDate = getReceiveDate(order);
        const target = filterDeliveryDate === 'today' ? today : filterDeliveryDate;
        if (receiveDate !== target) return false;
      }

      // 배달방법 필터
      if (filterDeliveryMethod === 'delivery' && order.is_pickup) return false;
      if (filterDeliveryMethod === 'pickup' && !order.is_pickup) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = order.customer.name.toLowerCase().includes(query);
        const matchPhone = order.customer.phone.includes(query);
        const matchDong = order.dong.includes(query);
        const matchHo = order.ho.includes(query);
        if (!matchName && !matchPhone && !matchDong && !matchHo) return false;
      }
      return true;
    });

    // 정렬
    return filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'created_at':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'delivery_date':
          // 픽업 주문은 pickup_date 우선, 없으면 delivery_date
          const dateA = a.is_pickup && a.pickup_date ? a.pickup_date : a.delivery_date;
          const dateB = b.is_pickup && b.pickup_date ? b.pickup_date : b.delivery_date;
          compareValue = new Date(dateA).getTime() - new Date(dateB).getTime();
          break;
        case 'total_amount':
          compareValue = a.total_amount - b.total_amount;
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }, [orders, filterApt, filterStatus, filterDeliveryDate, filterDeliveryMethod, searchQuery, showHidden, sortBy, sortOrder]);

  // 고유 수령날짜 목록 (픽업은 pickup_date, 배달은 delivery_date)
  const uniqueDeliveryDates = useMemo(() => {
    const dates = new Set<string>();
    orders.forEach((o) => {
      const d = getReceiveDate(o);
      if (d) dates.add(d);
    });
    return Array.from(dates).sort();
  }, [orders]);

  return {
    filterApt,
    setFilterApt,
    filterStatus,
    setFilterStatus,
    filterDeliveryDate,
    setFilterDeliveryDate,
    filterDeliveryMethod,
    setFilterDeliveryMethod,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    showHidden,
    setShowHidden,
    filteredOrders,
    uniqueDeliveryDates,
  };
}
