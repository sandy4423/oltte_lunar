import { Tag } from 'lucide-react';
import { SECOND_ORDER_AMOUNT, SECOND_ORDER_UNTIL_LABEL } from '@/lib/jache/discounts';
import { won } from '@/lib/jache/cart';

/** 2번째 주문 할인 한 줄 안내 (메뉴 화면: 이번 주문 / 완료 화면: 다음 주문). 대상이 아니면 부르는 쪽이 안 그린다 */
export function SecondOrderLine({ next = false, className = '' }: { next?: boolean; className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-[13px] font-semibold text-brand-dark ${className}`}>
      <Tag className="h-4 w-4 shrink-0" strokeWidth={2.25} />
      {next ? '다음' : '이번'} 주문 {won(SECOND_ORDER_AMOUNT)} 할인 · {SECOND_ORDER_UNTIL_LABEL}
    </p>
  );
}
