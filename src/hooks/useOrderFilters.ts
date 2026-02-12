/**
 * 주문 필터링 훅
 * 
 * 단지, 배송일, 상태, 검색어로 주문을 필터링합니다.
 */

import { useState, useMemo } from 'react';
import type { OrderFull } from '@/types/database';

export function useOrderFilters(orders: OrderFull[]) {
  const [filterApt, setFilterApt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDeliveryDate, setFilterDeliveryDate] = useState<string>('all');
  const [filterDeliveryMethod, setFilterDeliveryMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState<boolean>(false);

  // 필터링된 주문
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 숨긴 주문 토글: showHidden이 false면 숨긴 주문 제외
      if (!showHidden && order.is_hidden) return false;
      // showHidden이 true면 숨긴 주문만 표시
      if (showHidden && !order.is_hidden) return false;
      
      // 일반 필터
      if (filterStatus !== 'all' && order.status !== filterStatus) return false;
      if (filterApt !== 'all' && order.apt_code !== filterApt) return false;
      if (filterDeliveryDate !== 'all' && order.delivery_date !== filterDeliveryDate) return false;
      
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
  }, [orders, filterApt, filterStatus, filterDeliveryDate, filterDeliveryMethod, searchQuery, showHidden]);

  // 고유 배송일 목록
  const uniqueDeliveryDates = useMemo(() => {
    const dates = new Set(orders.map((o) => o.delivery_date));
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
    searchQuery,
    setSearchQuery,
    showHidden,
    setShowHidden,
    filteredOrders,
    uniqueDeliveryDates,
  };
}
