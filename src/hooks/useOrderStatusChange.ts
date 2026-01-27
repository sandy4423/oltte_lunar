/**
 * 주문 상태 변경 훅
 * 
 * 선택된 주문들의 상태를 일괄 변경합니다.
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
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

      // DB 업데이트 (Supabase 타입 이슈로 any 캐스팅)
      const updateData = { status: newStatus, updated_at: new Date().toISOString() };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = (supabase as any).from('orders').update(updateData).in('id', orderIds);
      const { error } = await query;

      if (error) throw error;

      // SMS 발송 API 호출 (TODO: 실제 구현)
      console.log(`[Admin] Status changed to ${newStatus} for ${orderIds.length} orders`);
      console.log('[Admin] SMS would be sent to:', orderIds);

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
