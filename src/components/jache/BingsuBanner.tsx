import { ChevronRight } from 'lucide-react';

// 올때빙수(2호점) 스마트 주문 사이트. 사진은 빙수 주문 사이트에 올라간 실제 메뉴 사진.
const BINGSU_URL = 'https://store.payhere.in/olttebs1';

const VARIANTS = [
  { img: '/jache/bingsu-injeolmi.jpg', title: '인절미빙수 (2인)', sub: '올때빙수 · 빙수도 주문해 보세요' },
  { img: '/jache/bingsu-hongsi.jpg', title: '1인 홍시빙수', sub: '올때빙수 · 달콤한 빙수 한 그릇' },
  { img: '/jache/bingsu-milk.jpg', title: '시그니처 순우유빙수 (2인)', sub: '올때빙수에서 주문하기' },
] as const;

export function BingsuBanner({ variant = 0 }: { variant?: number }) {
  const v = VARIANTS[variant % VARIANTS.length];
  return (
    <a
      href={BINGSU_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-8 flex h-20 items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-2 pr-4 transition active:scale-[0.99]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={v.img} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl bg-sky-100 object-cover" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-bold text-sky-950">{v.title}</span>
        <span className="truncate text-[13px] text-sky-800">{v.sub}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-sky-700" strokeWidth={2.5} aria-hidden />
    </a>
  );
}
