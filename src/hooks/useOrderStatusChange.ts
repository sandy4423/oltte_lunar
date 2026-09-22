/**
 * 주문 상태 변경 훅
 * 
 * 서버 API를 통해 선택된 주문들의 상태를 일괄 변경합니다.
 */

import { useState } from 'react';
import { ORDER_STATUS_LABEL } from '@/lib/constants';
import { getAdminPassword } from '@/lib/adminAuth';
import type { OrderStatus } from '@/types/database';

interface UseOrderStatusChangeParams {
  selectedOrders: Set<string>;
  onSuccess: () => void;
  onClearSelection: () => void;
}

/**
 * 전달완료 결과 설명 (2026-09-22)
 *
 * 캠페인 주문(떡국만두 등)은 `status` 대신 `picked_up_at` 에 수령 시각이 찍히고,
 * 택배·미입금·이미 수령한 건은 서버가 건너뜁니다. 몇 건이 어떻게 됐는지
 * 사장님이 화면에서 바로 알 수 있어야 합니다 (조용히 건너뛰면 물건을 두 번 내줍니다).
 */
export function hasCampaignOutcome(result: any): boolean {
  return (
    Number(result?.pickedUp ?? 0) > 0 ||
    (Array.isArray(result?.skipped) && result.skipped.length > 0) ||
    (Array.isArray(result?.smsSkipped) && result.smsSkipped.length > 0)
  );
}

export function describeDeliveredResult(result: any, requestedCount: number): string {
  const delivered = Number(result?.delivered ?? 0);
  const pickedUp = Number(result?.pickedUp ?? 0);
  const skipped: any[] = Array.isArray(result?.skipped) ? result.skipped : [];
  const smsSkipped: any[] = Array.isArray(result?.smsSkipped) ? result.smsSkipped : [];

  const done: string[] = [];
  if (delivered > 0) done.push(`전달완료 ${delivered}건`);
  if (pickedUp > 0) done.push(`수령완료 ${pickedUp}건 (떡국만두 등 캠페인 주문)`);

  let msg = done.length > 0 ? `${done.join('\n')} 처리했습니다.` : '처리된 주문이 없습니다.';

  if (skipped.length > 0) {
    msg += `\n\n[처리하지 않은 주문 ${skipped.length}건]\n`;
    msg += skipped.map((s) => `• ${s?.name ?? ''}: ${s?.message ?? ''}`).join('\n');
  }
  if (smsSkipped.length > 0) {
    msg += `\n\n※ 문자를 보내지 못한 주문 ${smsSkipped.length}건 (연락처 또는 문안 없음)`;
  }
  return msg;
}

export function useOrderStatusChange(params: UseOrderStatusChangeParams) {
  const { selectedOrders, onSuccess, onClearSelection } = params;
  const [actionLoading, setActionLoading] = useState(false);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (selectedOrders.size === 0) return;

    setActionLoading(true);
    try {
      const orderIds = Array.from(selectedOrders);

      const response = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPassword(),
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

      // 캠페인 주문이 섞였을 때만 자세히 알립니다. 전골만 골랐으면 예전 문구 그대로입니다
      alert(
        newStatus === 'DELIVERED' && hasCampaignOutcome(result)
          ? describeDeliveredResult(result, orderIds.length)
          : `${orderIds.length}건의 주문이 ${ORDER_STATUS_LABEL[newStatus]?.label || newStatus}(으)로 변경되었습니다.`
      );
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
