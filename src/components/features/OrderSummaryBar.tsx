/**
 * 주문 요약 바 컴포넌트 (하단 고정)
 */

import { Button } from '@/components/ui/button';

interface OrderSummaryBarProps {
  totalQty: number;
  totalAmount: number;
  isFormValid: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  dangolDiscount?: number;
}

export function OrderSummaryBar({
  totalQty,
  totalAmount,
  isFormValid,
  isSubmitting,
  onSubmit,
  dangolDiscount = 0,
}: OrderSummaryBarProps) {
  const displayAmount = totalAmount - dangolDiscount;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <div className="max-w-lg mx-auto">
        {dangolDiscount > 0 && (
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="text-red-500 font-medium">단골톡방 할인</span>
            <span className="text-red-500 font-semibold">-{dangolDiscount.toLocaleString()}원</span>
          </div>
        )}
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600">총 {totalQty}개</span>
          <span className="text-2xl font-bold text-brand">
            {displayAmount.toLocaleString()}원
          </span>
        </div>
        <Button
          onClick={onSubmit}
          disabled={!isFormValid || isSubmitting}
          className="w-full h-14 text-lg font-bold"
          size="xl"
        >
          {isSubmitting ? '처리중...' : '주문하기'}
        </Button>
        <p className="text-center text-xs text-gray-400 mt-2">
          문자로 계좌번호가 발송됩니다
        </p>
      </div>
    </div>
  );
}
