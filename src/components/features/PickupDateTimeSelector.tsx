'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MapPin } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STORE_INFO, PICKUP_DISCOUNT, PICKUP_EARLY_CLOSE_DATES, getAvailableTimeSlots, getAvailablePickupDates } from '@/lib/constants';

interface PickupDateTimeSelectorProps {
  pickupDate: string;
  setPickupDate: (date: string) => void;
  pickupTime: string;
  setPickupTime: (time: string) => void;
}

export function PickupDateTimeSelector({
  pickupDate,
  setPickupDate,
  pickupTime,
  setPickupTime,
}: PickupDateTimeSelectorProps) {
  // 1분마다 갱신하여 오늘 날짜의 시간 슬롯을 실시간 필터링
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const availableDates = useMemo(
    () => getAvailablePickupDates(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );

  const availableTimeSlots = useMemo(
    () => getAvailableTimeSlots(pickupDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickupDate, tick]
  );
  const earlyCloseTime = PICKUP_EARLY_CLOSE_DATES[pickupDate];

  // 선택된 날짜가 더 이상 유효하지 않으면 자동 초기화
  useEffect(() => {
    if (pickupDate && !availableDates.includes(pickupDate)) {
      setPickupDate('');
      setPickupTime('');
    }
  }, [availableDates, pickupDate, setPickupDate, setPickupTime]);

  // 선택된 시간이 더 이상 유효하지 않으면 자동 초기화
  useEffect(() => {
    if (pickupTime && !availableTimeSlots.includes(pickupTime)) {
      setPickupTime('');
    }
  }, [availableTimeSlots, pickupTime, setPickupTime]);

  // 날짜 변경 핸들러: 조기 마감 날짜로 변경 시 선택된 시간이 범위 밖이면 초기화
  const handleDateChange = (date: string) => {
    setPickupDate(date);
    const slots = getAvailableTimeSlots(date);
    if (pickupTime && !slots.includes(pickupTime)) {
      setPickupTime('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏪 픽업 정보
          <span className="text-sm font-normal text-orange-600 ml-auto">
            🎁 {PICKUP_DISCOUNT.toLocaleString()}원 할인!
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 픽업 장소 */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">픽업 장소</p>
              <p className="text-sm text-gray-700">{STORE_INFO.address}</p>
            </div>
          </div>
        </div>

        {/* 픽업 날짜 선택 */}
        <div className="space-y-2">
          <Label htmlFor="pickup-date" className="text-base font-semibold">
            픽업 날짜 <span className="text-destructive">*</span>
          </Label>
          <Select value={pickupDate} onValueChange={handleDateChange}>
            <SelectTrigger id="pickup-date" className="h-12">
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
          <Label htmlFor="pickup-time" className="text-base font-semibold">
            픽업 시간 <span className="text-destructive">*</span>
          </Label>
          <Select value={pickupTime} onValueChange={setPickupTime}>
            <SelectTrigger id="pickup-time" className="h-12">
              <SelectValue placeholder="픽업 시간을 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {availableTimeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            영업시간: 09:00 ~ {earlyCloseTime || '21:00'}
            {earlyCloseTime && ' (조기 마감)'}
          </p>
        </div>

        {/* 안내 문구 */}
        <div className="text-sm text-gray-600 space-y-1 pt-2">
          <p>• 선택하신 날짜와 시간에 매장에서 픽업해주세요</p>
          <p>• 주문하신 상품은 미리 준비해드립니다</p>
          <p>• 픽업 시 {PICKUP_DISCOUNT.toLocaleString()}원 자동 할인됩니다</p>
        </div>
      </CardContent>
    </Card>
  );
}
