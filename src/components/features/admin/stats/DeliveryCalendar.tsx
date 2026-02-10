/**
 * 배송 캘린더 컴포넌트
 * 
 * 2026년 2월 달력에 날짜별 필요 상품 수량을 표시합니다.
 * 배송일이 있는 날짜를 강조하고, 상품별 수량을 보여줍니다.
 */

'use client';

import { CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRODUCTS } from '@/lib/constants';

interface DeliveryCalendarProps {
  calendar: Record<string, {
    items: Record<string, number>;
    orderCount: {
      delivery: number;
      pickup: number;
    };
  }>;
}

// 상품 정보 매핑 (캘린더용 간결한 이름)
const PRODUCT_INFO: Record<string, { name: string; emoji: string }> = {
  meat: { name: '고기', emoji: '🥟' },
  kimchi: { name: '김치', emoji: '🌶️' },
  tteokguk: { name: '떡국', emoji: '🍚' },
  yuksu: { name: '육수', emoji: '🍲' },
};

// 상품 표시 순서
const PRODUCT_ORDER = ['meat', 'kimchi', 'tteokguk', 'yuksu'];

// 요일 헤더
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function DeliveryCalendar({ calendar }: DeliveryCalendarProps) {
  // 2026년 2월 기준
  const currentMonth = new Date(2026, 1, 1); // 2월 = 1 (0-indexed)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart); // 일요일부터
  const calendarEnd = endOfWeek(monthEnd);

  // 달력 셀 생성
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // 주 단위로 분할
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          배송 캘린더 (2026년 2월)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((weekday, idx) => (
            <div
              key={weekday}
              className={`text-center text-xs font-semibold py-2 ${
                idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {weekday}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.map((week) =>
            week.map((dayDate) => {
              const dateStr = format(dayDate, 'yyyy-MM-dd');
              const dayOfWeek = dayDate.getDay();
              const isCurrentMonth = isSameMonth(dayDate, currentMonth);
              const isCurrentDay = isToday(dayDate);
              const dateData = calendar[dateStr];
              const hasData = dateData && Object.keys(dateData.items || {}).length > 0;
              const totalQty = hasData
                ? Object.values(dateData.items).reduce((sum, qty) => sum + qty, 0)
                : 0;
              const deliveryCount = dateData?.orderCount.delivery || 0;
              const pickupCount = dateData?.orderCount.pickup || 0;
              const totalOrders = deliveryCount + pickupCount;

              return (
                <div
                  key={dateStr}
                  className={`
                    min-h-[90px] md:min-h-[110px] border rounded-md p-1 transition-colors
                    ${!isCurrentMonth ? 'bg-gray-50 opacity-40' : ''}
                    ${isCurrentDay ? 'border-blue-500 border-2' : 'border-gray-200'}
                    ${hasData ? 'bg-blue-50' : ''}
                  `}
                >
                  {/* 날짜 */}
                  <div className={`text-xs font-semibold mb-1 ${
                    dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'
                  }`}>
                    {format(dayDate, 'd')}
                  </div>

                  {/* 상품 수량 */}
                  {hasData && isCurrentMonth && (
                    <div className="space-y-0.5">
                      {PRODUCT_ORDER.map((sku) => {
                        const qty = dateData.items[sku];
                        const info = PRODUCT_INFO[sku];
                        if (!info || !qty || qty === 0) return null;

                        return (
                          <div key={sku} className="text-[10px] md:text-xs text-gray-700">
                            {info.emoji} {info.name} {qty}개
                          </div>
                        );
                      })}

                      {/* 구분선 */}
                      {totalOrders > 0 && (
                        <div className="border-t border-gray-300 pt-0.5 mt-0.5">
                          {/* 주문 건수 */}
                          <div className="text-[10px] text-gray-600 space-y-0.5">
                            {deliveryCount > 0 && (
                              <div>🚚 배송 {deliveryCount}건</div>
                            )}
                            {pickupCount > 0 && (
                              <div>🏪 픽업 {pickupCount}건</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
          {Object.entries(PRODUCT_INFO).map(([sku, info]) => (
            <span key={sku} className="flex items-center gap-1">
              {info.emoji} {info.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
