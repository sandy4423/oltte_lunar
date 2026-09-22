'use client';

import { format } from 'date-fns';

/**
 * 「수령완료」 배지 (2026-09-22)
 *
 * 캠페인 주문(떡국만두 등)은 손님이 가져가도 `status` 가 **결제완료 그대로**입니다
 * (장부앱 카운터가 `['PAID','LATE_DEPOSIT']` 만 입금완료로 보기 때문).
 * 그래서 상태 배지만 보면 수령한 것과 안 한 것이 구분되지 않습니다.
 * 수령 여부는 `orders.picked_up_at` 이 정하고, 이 배지가 그것을 보여줍니다.
 */
export function PickedUpBadge({ pickedUpAt }: { pickedUpAt?: string | null }) {
  if (!pickedUpAt) return null;

  let when = '';
  try {
    when = format(new Date(pickedUpAt), 'M/d HH:mm');
  } catch {
    when = '';
  }

  return (
    <span
      title={`수령 처리: ${pickedUpAt}`}
      className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-700 bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white"
    >
      ✅ 수령완료{when ? ` ${when}` : ''}
    </span>
  );
}
