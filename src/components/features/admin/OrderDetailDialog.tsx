'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ORDER_STATUS_LABEL, getProductBySku, PICKUP_APT_CODE } from '@/lib/constants';
import { calculateDiscountBreakdown } from '@/lib/pricing';

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
    const confirmMsg = `${order.customer.name}님에게 전달완료 처리하시겠습니까?\n\n전달완료 SMS가 발송됩니다.`;

    if (confirm(confirmMsg)) {
      onDelivered(order.id);
    }
  };

  // 할인 내역 계산 — 정가 기준 소계와 DB 저장값 비교
  const breakdown = calculateDiscountBreakdown(order.order_items ?? [], order.source);
  const storedDangol = order.dangol_discount ?? 0;
  const pickupDiscount = order.pickup_discount ?? 0;
  const expectedTotal = breakdown.subtotal - breakdown.dangolTotal - pickupDiscount;
  // DB의 dangol_discount가 재계산값과 불일치 → 과거 누락 버그 건 경고
  const dangolMismatch = order.source === 'dangol' && storedDangol !== breakdown.dangolTotal;
  // 저장된 total_amount가 소계-할인 계산과 불일치 → 일반적 정합성 경고
  const totalMismatch = order.total_amount !== expectedTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg">
                주문 상세
              </DialogTitle>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {isPickup ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-purple-500 text-white border border-purple-600">
                  🏪 픽업
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-500 text-white border border-blue-600">
                  🚚 배달
                </span>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100"
              title="닫기"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* 고객 정보 + 배송/픽업 정보 */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500 text-xs">이름</span>
                <p className="font-medium">{order.customer.name}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">연락처</span>
                <p className="font-medium">
                  {order.customer.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                </p>
              </div>
            </div>
            <div className="border-t pt-2 space-y-1">
              {isPickup ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">픽업일시</span>
                    <span className="font-medium text-purple-600">
                      {order.pickup_date ? format(new Date(order.pickup_date), 'M/d (EEE)', { locale: ko }) : '-'}
                      {order.pickup_time ? ` ${order.pickup_time}` : ''}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">단지</span>
                    <span className="font-medium">{order.apt_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">동/호</span>
                    <span className="font-medium">{order.dong}동 {order.ho}호</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">배송일</span>
                    <span className="font-medium">
                      {format(new Date(order.delivery_date), 'M월 d일 (EEE)', { locale: ko })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 상품 정보 */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            <h3 className="font-semibold text-xs text-gray-500">주문 상품</h3>
            <div className="space-y-1.5">
              {order.order_items.map((item: any) => {
                const product = getProductBySku(item.sku);
                const itemAmount = item.line_amount ?? (item.unit_price ?? 0) * item.qty;
                return (
                  <div key={item.id} className="flex justify-between items-center">
                    <span>
                      {product?.emoji} {product?.name || item.sku} x{item.qty}
                    </span>
                    <span className="font-medium">
                      {itemAmount.toLocaleString()}원
                    </span>
                  </div>
                );
              })}

              {/* 소계 / 할인 / 합계 */}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between items-center text-gray-600">
                  <span>소계</span>
                  <span>{breakdown.subtotal.toLocaleString()}원</span>
                </div>

                {order.source === 'dangol' && breakdown.dangolTotal > 0 && (
                  <div className="flex justify-between items-start text-pink-600">
                    <div>
                      <div>단골톡방 할인</div>
                      <div className="text-[10px] text-pink-400 leading-tight">
                        {breakdown.hotpotQty > 0 && `전골 ${breakdown.hotpotQty}개 × 2,000`}
                        {breakdown.hotpotQty > 0 && breakdown.noodleQty > 0 && ' · '}
                        {breakdown.noodleQty > 0 && `칼국수 ${breakdown.noodleQty}개 × 500`}
                      </div>
                    </div>
                    <span>-{breakdown.dangolTotal.toLocaleString()}원</span>
                  </div>
                )}

                {pickupDiscount > 0 && (
                  <div className="flex justify-between items-center text-purple-600">
                    <span>픽업 할인</span>
                    <span>-{pickupDiscount.toLocaleString()}원</span>
                  </div>
                )}

                {dangolMismatch && (
                  <div className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      DB 저장 단골할인({storedDangol.toLocaleString()}원)이 재계산값(
                      {breakdown.dangolTotal.toLocaleString()}원)과 다릅니다. 과거 누락 버그 건일 수 있어요.
                    </span>
                  </div>
                )}

                {!dangolMismatch && totalMismatch && (
                  <div className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      저장된 합계({order.total_amount.toLocaleString()}원)가 소계·할인 계산(
                      {expectedTotal.toLocaleString()}원)과 일치하지 않습니다.
                    </span>
                  </div>
                )}

                <div className="border-t pt-1 flex justify-between items-center">
                  <span className="font-semibold">합계</span>
                  <span className="font-bold text-lg">{order.total_amount.toLocaleString()}원</span>
                </div>
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
              {actionLoading ? '처리 중...' : '전달완료'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
