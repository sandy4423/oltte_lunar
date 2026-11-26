import { Check, Gift } from 'lucide-react';
import { GIFT_NAME, GIFT_THRESHOLD, giftStatus, type GiftItem } from '@/lib/jache/gift';
import { won } from '@/lib/jache/cart';

/**
 * 15,000원 이상 제로식혜 증정 진행 표시. payTotal = 손님이 내는 음식값.
 *  - 비어 있을 때(empty): 한 줄 안내만
 *  - 기준 아래: 「N원 더 담으면 제로식혜 무료」 + 가는 막대
 *  - 기준 이상: 「제로식혜 1개 함께 드려요」 (체크)
 * 증정 상품이 없거나(품절·메뉴판에 없음) 이벤트 기간이 아니면 아무것도 그리지 않는다.
 */
export function GiftMeter({ payTotal, gift, empty = false, className = '' }: { payTotal: number; gift: GiftItem | null; empty?: boolean; className?: string }) {
  const s = giftStatus(payTotal, gift);
  if (!s.active) return null;
  if (empty) {
    return (
      <p className={`flex items-center gap-1.5 text-[13px] font-semibold text-brand-dark ${className}`}>
        <Gift className="h-4 w-4" strokeWidth={2.25} />
        {won(GIFT_THRESHOLD)} 이상 {GIFT_NAME} 무료
      </p>
    );
  }
  return (
    <div className={className} role="status" aria-live="polite">
      <p className={`flex items-center gap-1.5 text-[13px] font-bold ${s.eligible ? 'text-green-700' : 'text-zinc-800'}`}>
        {s.eligible ? (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-white">
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
        ) : (
          <Gift className="h-4 w-4 text-brand-dark" strokeWidth={2.25} />
        )}
        {s.eligible ? `${GIFT_NAME} 1개 함께 드려요` : (
          <span>
            <span className="tabular-nums text-brand-dark">{won(s.remaining)}</span> 더 담으면 {GIFT_NAME} 무료
          </span>
        )}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-200" aria-hidden="true">
        <div className={`h-full rounded-full transition-[width] duration-300 ${s.eligible ? 'bg-green-600' : 'bg-brand-dark'}`} style={{ width: `${Math.round(s.progress * 100)}%` }} />
      </div>
    </div>
  );
}
