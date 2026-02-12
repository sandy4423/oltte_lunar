/**
 * 배달/픽업 선택 다이얼로그
 * 
 * 1단계: 배달 / 픽업 선택
 * 2단계: 픽업 선택 시 날짜/시간 입력
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Truck, Store, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PICKUP_DISCOUNT,
  STORE_INFO,
  PICKUP_EARLY_CLOSE_DATES,
  getAvailableTimeSlots,
  getAvailablePickupDates,
} from '@/lib/constants';

interface DeliveryMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryDate: string | Date;
  onSelect: (isPickup: boolean, pickupDate?: string, pickupTime?: string) => void;
}

export function DeliveryMethodDialog({
  open,
  onOpenChange,
  deliveryDate,
  onSelect,
}: DeliveryMethodDialogProps) {
  const formattedDate = format(new Date(deliveryDate), 'M월 d일(EEE)', { locale: ko });
  const [step, setStep] = useState<'method' | 'pickupTime'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'delivery' | 'pickup' | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  // 다이얼로그 열릴 때마다 초기화
  useEffect(() => {
    if (open) {
      setStep('method');
      setSelectedMethod(null);
      setPickupDate('');
      setPickupTime('');
    }
  }, [open]);

  // 픽업 가능 날짜/시간 계산
  const availableDates = useMemo(() => getAvailablePickupDates(), [open]);
  const availableTimeSlots = useMemo(
    () => (pickupDate ? getAvailableTimeSlots(pickupDate) : []),
    [pickupDate]
  );
  const earlyCloseTime = pickupDate ? PICKUP_EARLY_CLOSE_DATES[pickupDate] : undefined;

  // 날짜 변경 시 시간 초기화
  const handleDateChange = (date: string) => {
    setPickupDate(date);
    const slots = getAvailableTimeSlots(date);
    if (pickupTime && !slots.includes(pickupTime)) {
      setPickupTime('');
    }
  };

  // 1단계: 배달/픽업 선택
  const handleMethodClick = (method: 'delivery' | 'pickup') => {
    setSelectedMethod(method);
  };

  // 1단계 확인: 배달이면 바로 주문, 픽업이면 2단계로
  const handleMethodConfirm = () => {
    if (selectedMethod === 'delivery') {
      onSelect(false);
      onOpenChange(false);
    } else if (selectedMethod === 'pickup') {
      setStep('pickupTime');
    }
  };

  // 2단계 확인: 픽업 날짜/시간 선택 후 주문
  const handlePickupConfirm = () => {
    if (pickupDate && pickupTime) {
      onSelect(true, pickupDate, pickupTime);
      onOpenChange(false);
    }
  };

  // 뒤로가기
  const handleBack = () => {
    setStep('method');
    setPickupDate('');
    setPickupTime('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'method' ? (
          <>
            {/* 1단계: 배달/픽업 선택 */}
            <DialogHeader>
              <DialogTitle className="text-center text-xl">배달 방법을 선택해주세요</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* 배달 버튼 */}
              <button
                onClick={() => handleMethodClick('delivery')}
                className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 group ${
                  selectedMethod === 'delivery'
                    ? 'border-brand bg-orange-100 shadow-lg'
                    : 'border-gray-200 hover:border-brand hover:bg-orange-50'
                }`}
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
                onClick={() => handleMethodClick('pickup')}
                className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 group ${
                  selectedMethod === 'pickup'
                    ? 'border-brand bg-orange-100 shadow-lg'
                    : 'border-brand bg-orange-50 hover:bg-orange-100'
                }`}
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
                    날짜와 시간을 선택하여 픽업 가능
                  </p>
                  <p className="text-xs text-gray-600">
                    {STORE_INFO.address}
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleMethodConfirm}
                disabled={!selectedMethod}
                className="w-full h-12 text-lg font-bold"
              >
                {selectedMethod === 'pickup' ? '다음 - 픽업 시간 선택' : '주문하기'}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* 2단계: 픽업 날짜/시간 선택 */}
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  title="뒤로가기"
                  aria-label="뒤로가기"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <DialogTitle className="text-xl">픽업 시간을 선택해주세요</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 픽업 장소 안내 */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">픽업 장소</p>
                <p className="text-sm text-gray-700">{STORE_INFO.address}</p>
              </div>

              {/* 픽업 날짜 선택 */}
              <div className="space-y-2">
                <Label htmlFor="dialog-pickup-date" className="text-base font-semibold">
                  픽업 날짜 <span className="text-destructive">*</span>
                </Label>
                <Select value={pickupDate} onValueChange={handleDateChange}>
                  <SelectTrigger id="dialog-pickup-date" className="h-12">
                    <SelectValue placeholder="픽업 날짜를 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map((date) => {
                      const dateObj = new Date(date);
                      const isToday = format(new Date(), 'yyyy-MM-dd') === date;
                      const label = format(dateObj, 'M월 d일 (EEE)', { locale: ko });
                      
                      return (
                        <SelectItem key={date} value={date}>
                          {label}
                          {isToday && ' (오늘)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* 픽업 시간 선택 */}
              <div className="space-y-2">
                <Label htmlFor="dialog-pickup-time" className="text-base font-semibold">
                  픽업 시간 <span className="text-destructive">*</span>
                </Label>
                <Select value={pickupTime} onValueChange={setPickupTime} disabled={!pickupDate}>
                  <SelectTrigger id="dialog-pickup-time" className="h-12">
                    <SelectValue placeholder={pickupDate ? '픽업 시간을 선택해주세요' : '날짜를 먼저 선택해주세요'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pickupDate && (
                  <p className="text-xs text-gray-500">
                    영업시간: 09:00 ~ {earlyCloseTime || '21:00'}
                    {earlyCloseTime && ' (조기 마감)'}
                  </p>
                )}
              </div>

              {/* 안내 문구 */}
              <div className="text-sm text-gray-600 space-y-1">
                <p>- 선택하신 날짜와 시간에 매장에서 픽업해주세요</p>
                <p>- 픽업 시 {PICKUP_DISCOUNT.toLocaleString()}원 자동 할인됩니다</p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handlePickupConfirm}
                disabled={!pickupDate || !pickupTime}
                className="w-full h-12 text-lg font-bold"
              >
                주문하기
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
