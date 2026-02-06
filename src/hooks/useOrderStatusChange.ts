/**
 * 주문 상태 변경 훅
 * 
 * 서버 API를 통해 선택된 주문들의 상태를 일괄 변경합니다.
 */

import { useState } from 'react';
import { ORDER_STATUS_LABEL } from '@/lib/constants';
import type { OrderStatus } from '@/types/database';

interface UseOrderStatusChangeParams {
  selectedOrders: Set<string>;
  onSuccess: () => void;
  onClearSelection: () => void;
}

export function useOrderStatusChange(params: UseOrderStatusChangeParams) {
  const { selectedOrders, onSuccess, onClearSelection } = params;
  const [actionLoading, setActionLoading] = useState(false);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (selectedOrders.size === 0) return;

    setActionLoading(true);
    try {
      const orderIds = Array.from(selectedOrders);

      // 서버 API 호출
      const adminPassword = typeof window !== 'undefined' ? sessionStorage.getItem('admin_password') || '' : '';
      const response = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({
          orderIds,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('상태 변경에 실패했습니다.');
      }

      const result = await response.json();
      console.log(`[Admin] Status changed to ${newStatus} for ${result.updatedCount} orders`);

      // 새로고침
      await onSuccess();
      onClearSelection();

      alert(`${orderIds.length}건의 주문이 ${ORDER_STATUS_LABEL[newStatus]?.label || newStatus}(으)로 변경되었습니다.`);
    } catch (err) {
      console.error('Status change error:', err);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    handleStatusChange,
  };
}
