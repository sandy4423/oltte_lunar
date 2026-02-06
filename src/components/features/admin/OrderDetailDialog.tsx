'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ORDER_STATUS_LABEL, getProductBySku, PICKUP_APT_CODE } from '@/lib/constants';

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
  onDelivered: (orderId: string) => void;
  actionLoading: boolean;
}

export function OrderDetailDialog({
  open,
  onOpenChange,
  order,
  onDelivered,
  actionLoading,
}: OrderDetailDialogProps) {
  if (!order) return null;

  const statusInfo = ORDER_STATUS_LABEL[order.status] || {
    label: order.status,
    color: 'bg-gray-500 text-white',
  };

  const isPickup = order.apt_code === PICKUP_APT_CODE;
  const canDeliver = ['PAID', 'OUT_FOR_DELIVERY', 'LATE_DEPOSIT'].includes(order.status);

  const handleDelivered = () => {
    const confirmMsg = isPickup
      ? `${order.customer.name}님에게 고객 전달완료 처리하시겠습니까?\n\n전달완료 SMS가 발송됩니다.`
      : `${order.customer.name}님에게 배송완료 처리하시겠습니까?\n\n배송완료 SMS가 발송됩니다.`;

    if (confirm(confirmMsg)) {
      onDelivered(order.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              주문 상세
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100"
              title="닫기"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* 상태 배지 */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {isPickup ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500 text-white border border-purple-600">
                🏪 픽업
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500 text-white border border-blue-600">
                🚚 배달
              </span>
            )}
          </div>

          {/* 고객 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm text-gray-500">고객 정보</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">이름</span>
                <p className="font-medium">{order.customer.name}</p>
              </div>
              <div>
                <span className="text-gray-500">연락처</span>
                <p className="font-medium">
                  {order.customer.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                </p>
              </div>
            </div>
          </div>

          {/* 배송/픽업 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm text-gray-500">
              {isPickup ? '픽업 정보' : '배송 정보'}
            </h3>
            <div className="text-sm space-y-1">
              {isPickup ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">단지</span>
                    <span className="font-medium">🏪 픽업주문</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">픽업일시</span>
                    <span className="font-medium text-purple-600">
                      {order.pickup_date ? format(new Date(order.pickup_date), 'M/d (EEE)', { locale: ko }) : '-'}
                      {order.pickup_time ? ` ${order.pickup_time}` : ''}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">단지</span>
                    <span className="font-medium">{order.apt_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">동/호</span>
                    <span className="font-medium">{order.dong}동 {order.ho}호</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">배송일</span>
                    <span className="font-medium">
                      {format(new Date(order.delivery_date), 'M월 d일 (EEE)', { locale: ko })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 상품 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm text-gray-500">주문 상품</h3>
            <div className="space-y-2">
              {order.order_items.map((item: any) => {
                const product = getProductBySku(item.sku);
                return (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span>
                      {product?.emoji} {product?.name || item.sku} x{item.qty}
                    </span>
                    <span className="font-medium">
                      {(item.price * item.qty).toLocaleString()}원
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-semibold">합계</span>
                <span className="font-bold text-lg">{order.total_amount.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* 주문 일시 */}
          <div className="text-xs text-gray-400 text-right">
            주문일시: {format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss')}
          </div>

          {/* 고객 전달완료 버튼 */}
          {canDeliver && (
            <Button
              onClick={handleDelivered}
              disabled={actionLoading}
              className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              {actionLoading ? '처리 중...' : (isPickup ? '고객 전달완료' : '배송완료')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
