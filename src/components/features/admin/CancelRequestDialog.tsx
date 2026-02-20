'use client';

import { useState } from 'react';
import { getAdminPassword } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Order {
  id: string;
  customer: {
    name: string;
    phone: string;
  };
  apt_name: string;
  dong: string;
  ho: string;
  total_amount: number;
}

interface CancelRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess: () => void;
}

export function CancelRequestDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: CancelRequestDialogProps) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 다이얼로그가 열릴 때마다 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setRefundAmount('');
      setRefundReason('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  // 전액 환불 버튼
  const handleFullRefund = () => {
    if (order) {
      setRefundAmount(order.total_amount.toString());
    }
  };

  // 취소 요청 제출
  const handleSubmit = async () => {
    if (!order) return;

    // 검증
    const amount = parseInt(refundAmount);
    if (!refundAmount || isNaN(amount) || amount <= 0) {
      setError('환불 금액을 입력해주세요.');
      return;
    }

    if (amount > order.total_amount) {
      setError(`환불 금액이 주문 금액(${order.total_amount.toLocaleString()}원)을 초과할 수 없습니다.`);
      return;
    }

    if (!refundReason.trim()) {
      setError('환불 사유를 입력해주세요.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/orders/cancel-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPassword(),
        },
        body: JSON.stringify({
          orderId: order.id,
          refundAmount: amount,
          refundReason: refundReason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '취소 요청에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      // 성공
      alert('취소 요청이 완료되었습니다.\n고객에게 계좌입력 링크를 발송했습니다.');
      handleOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError('취소 요청 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>주문 취소 요청</DialogTitle>
          <DialogDescription>
            환불 금액과 사유를 입력하면 고객에게 계좌입력 링크를 발송합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 주문 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">주문번호</span>
              <span className="font-mono text-xs">{order.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">고객명</span>
              <span>{order.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">연락처</span>
              <span>{order.customer.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">배송지</span>
              <span>{order.apt_name} {order.dong}동 {order.ho}호</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-900">주문금액</span>
              <span className="font-bold text-lg">{order.total_amount.toLocaleString()}원</span>
            </div>
          </div>

          {/* 환불 금액 입력 */}
          <div className="space-y-2">
            <Label htmlFor="refundAmount">환불 금액 (원)</Label>
            <div className="flex gap-2">
              <Input
                id="refundAmount"
                type="number"
                inputMode="numeric"
                placeholder="환불 금액을 입력하세요"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min="0"
                max={order.total_amount}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleFullRefund}
                className="whitespace-nowrap"
              >
                전액 환불
              </Button>
            </div>
            {refundAmount && !isNaN(parseInt(refundAmount)) && (
              <p className="text-sm text-gray-600">
                환불 금액: <span className="font-semibold text-blue-600">
                  {parseInt(refundAmount).toLocaleString()}원
                </span>
              </p>
            )}
          </div>

          {/* 환불 사유 입력 */}
          <div className="space-y-2">
            <Label htmlFor="refundReason">환불 사유 (필수)</Label>
            <Input
              id="refundReason"
              type="text"
              placeholder="예: 고객 요청, 상품 하자, 배송 불가 등"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-gray-500">
              고객에게 표시되는 사유입니다.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              📱 고객에게 SMS로 계좌입력 링크가 발송됩니다.<br />
              💳 고객이 계좌번호를 입력하면 자동으로 환불이 처리됩니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '처리 중...' : '취소 요청 및 링크 전송'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
