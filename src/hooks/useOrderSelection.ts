/**
 * 주문 선택 훅
 * 
 * 주문 체크박스 선택/해제를 관리합니다.
 */

import { useState } from 'react';
import type { OrderFull } from '@/types/database';

export function useOrderSelection() {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean, filteredOrders: OrderFull[]) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  // 개별 선택
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // 선택 초기화
  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  return {
    selectedOrders,
    handleSelectAll,
    handleSelectOrder,
    clearSelection,
  };
}
