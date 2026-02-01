/**
 * 배달/픽업 선택 다이얼로그
 */

'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Truck, Store } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PICKUP_DISCOUNT, STORE_INFO } from '@/lib/constants';

interface DeliveryMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryDate: string | Date;
  onSelect: (isPickup: boolean) => void;
}

export function DeliveryMethodDialog({
  open,
  onOpenChange,
  deliveryDate,
  onSelect,
}: DeliveryMethodDialogProps) {
  const formattedDate = format(new Date(deliveryDate), 'M월 d일(EEE)', { locale: ko });

  const handleSelect = (isPickup: boolean) => {
    onSelect(isPickup);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">배달 방법을 선택해주세요</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 배달 버튼 */}
          <button
            onClick={() => handleSelect(false)}
            className="relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-brand hover:bg-orange-50 transition-all duration-200 group"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 group-hover:bg-brand group-hover:scale-110 transition-all">
              <Truck className="w-8 h-8 text-brand group-hover:text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-1">배달 받기</h3>
              <p className="text-sm text-gray-600">
                {formattedDate}에 집 앞까지 배달해 드립니다
              </p>
            </div>
          </button>

          {/* 픽업 버튼 */}
          <button
            onClick={() => handleSelect(true)}
            className="relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-brand bg-orange-50 hover:bg-orange-100 transition-all duration-200 group"
          >
            {/* 할인 배지 */}
            <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              {PICKUP_DISCOUNT.toLocaleString()}원 할인
            </div>
            
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand group-hover:scale-110 transition-all">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-brand-dark mb-1">매장 픽업</h3>
              <p className="text-sm text-gray-700 font-medium mb-1">
                {formattedDate}에 픽업 가능
              </p>
              <p className="text-xs text-gray-600">
                {STORE_INFO.address}
              </p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          선택하신 방법으로 주문이 진행됩니다
        </p>
      </DialogContent>
    </Dialog>
  );
}
