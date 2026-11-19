import { won } from '@/lib/jache/cart';

/**
 * 손님이 내는 값 + 할인이 있으면 정가 줄긋기 + 그 아래 아주 작은 빨간 글씨로 할인 이름
 * (사장님 11-19 「할인할 때는 취소선 위 혹은 아래에 아주 작은 빨간 글씨로 할인 제목을 넣어놔야지 알지」)
 */
export function Price({ pay, list, labels, className = '', align = 'start' }: { pay: number; list: number; labels?: string[]; className?: string; align?: 'start' | 'end' }) {
  const shown = list > pay && labels?.length ? Array.from(new Set(labels)) : [];
  return (
    <span className={`inline-flex flex-col ${align === 'end' ? 'items-end' : 'items-start'}`}>
      <span className={`inline-flex items-baseline gap-1.5 tabular-nums ${className}`}>
        <span>{won(pay)}</span>
        {list > pay && <s className="text-[0.85em] font-normal text-zinc-400">{won(list)}</s>}
      </span>
      {shown.length > 0 && <span className="mt-0.5 text-[11px] font-semibold leading-none text-red-600">{shown.join(' · ')}</span>}
    </span>
  );
}
