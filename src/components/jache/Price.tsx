import { won } from '@/lib/jache/cart';

/** 손님이 내는 값 + 할인이 있으면 정가 줄긋기 */
export function Price({ pay, list, className = '' }: { pay: number; list: number; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 tabular-nums ${className}`}>
      <span>{won(pay)}</span>
      {list > pay && <s className="text-[0.85em] font-normal text-zinc-400">{won(list)}</s>}
    </span>
  );
}
