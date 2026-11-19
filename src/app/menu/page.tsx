'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { CartLine, MenuCategory, MenuItem } from '@/lib/jache/types';
import { cartCount, hhmm, kstNow, lineKey, pickupState, won } from '@/lib/jache/cart';
import { unitDiscountFor } from '@/lib/jache/discounts';
import { Price } from '@/components/jache/Price';
import { useJacheCart } from '@/hooks/useJacheCart';
import { ItemSheet } from '@/components/jache/ItemSheet';

export default function MenuPage() {
  const [cats, setCats] = useState<MenuCategory[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState<MenuItem | null>(null);
  const [active, setActive] = useState<string>('');
  const [closedMsg, setClosedMsg] = useState<string | null>(null);
  const cart = useJacheCart();
  const chipRow = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setFailed(false);
    fetch('/api/menu')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setCats(d.categories);
        setActive(d.categories[0]?.id ?? '');
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const s = pickupState(kstNow());
    if (s.state === 'closedDay') setClosedMsg('오늘은 쉬는 날이에요');
    else if (s.state === 'ended') setClosedMsg('오늘 주문이 끝났어요');
    else if (!s.canNow) setClosedMsg(`${hhmm(s.opensAt)} 오픈`);
  }, []);

  // 스크롤 위치에 맞춰 칩 강조
  useEffect(() => {
    if (!cats) return;
    const onScroll = () => {
      let cur = cats[0]?.id ?? '';
      for (const c of cats) {
        const el = document.getElementById(`cat-${c.id}`);
        if (el && el.getBoundingClientRect().top <= 120) cur = c.id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [cats]);

  useEffect(() => {
    chipRow.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  const jump = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
  };

  const quickAdd = (item: MenuItem) => {
    if (item.optionGroups.length > 0) return setSheet(item);
    const line: CartLine = { key: lineKey(item.id, []), itemId: item.id, title: item.title, basePrice: item.price, imageUrl: item.imageUrl, qty: 1, choices: [] };
    cart.add(line);
  };

  const qtyIn = (itemId: string) => cart.lines.filter((l) => l.itemId === itemId).reduce((s, l) => s + l.qty, 0);

  return (
    <main className="min-h-dvh bg-[#FBFAF7] pb-32 text-zinc-900" style={{ fontFamily: '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif' }}>
      <header className="mx-auto max-w-3xl px-5 pb-3 pt-8">
        <p className="text-sm font-semibold text-brand-dark">포장 주문</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight">올때만두</h1>
        {closedMsg && <p className="mt-3 inline-block rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white">{closedMsg}</p>}
      </header>

      {cats && (
        <nav className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#FBFAF7]/95 backdrop-blur">
          <div ref={chipRow} className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cats.map((c) => (
              <button
                key={c.id}
                data-active={active === c.id}
                onClick={() => jump(c.id)}
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                  active === c.id ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-3xl px-5">
        {!cats && !failed && <MenuSkeleton />}
        {failed && (
          <div className="py-24 text-center">
            <p className="text-base font-medium text-zinc-700">메뉴를 불러오지 못했어요</p>
            <button onClick={load} className="mt-4 h-12 rounded-2xl bg-zinc-900 px-6 text-sm font-bold text-white">
              다시 불러오기
            </button>
          </div>
        )}
        {cats?.map((c, ci) => (
          <Fragment key={c.id}>
          <section id={`cat-${c.id}`} className="pt-8">
            <h2 className="mb-3 text-lg font-bold tracking-tight">{c.title}</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {c.items.map((it) => (
                <li key={it.id}>
                  <ItemCard item={it} inCart={qtyIn(it.id)} onOpen={() => !it.soldOut && quickAdd(it)} onQuick={() => quickAdd(it)} />
                </li>
              ))}
            </ul>
          </section>
          {/* 올때빙수 홍보 배너: 첫 카테고리 뒤·중간·맨 아래 (진짜 링크) */}
          </Fragment>
        ))}
      </div>

      {cart.hydrated && cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Link
              href="/menu/checkout"
              className="flex h-14 items-center justify-between rounded-2xl bg-brand-dark px-5 text-base font-bold text-white transition active:scale-[0.99]"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-sm font-extrabold text-brand-dark">{cartCount(cart.lines)}</span>
                주문하기
              </span>
              <span className="tabular-nums">{won(cart.total)}</span>
            </Link>
          </div>
        </div>
      )}

      {sheet && <ItemSheet item={sheet} onClose={() => setSheet(null)} onAdd={cart.add} />}
    </main>
  );
}

function ItemCard({ item, inCart, onOpen, onQuick }: { item: MenuItem; inCart: number; onOpen: () => void; onQuick: () => void }) {
  return (
    <div
      className={`relative flex min-h-[116px] gap-4 rounded-2xl border border-zinc-200/80 bg-white p-3 pl-4 transition ${
        item.soldOut ? 'opacity-55' : 'active:scale-[0.99]'
      }`}
    >
      <button onClick={onOpen} disabled={item.soldOut} className="flex min-w-0 flex-1 flex-col text-left" aria-label={`${item.title} 담기`}>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-[15px] font-bold leading-snug text-zinc-900">{item.title}</span>
          {item.labels.map((l) => (
            <span key={l} className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-dark">
              {l}
            </span>
          ))}
        </span>
        {item.description && <span className="mt-1 line-clamp-2 whitespace-pre-line text-[13px] leading-snug text-zinc-500">{item.description}</span>}
        <span className="mt-auto pt-2 text-[15px] font-semibold tabular-nums text-zinc-900">
          {item.soldOut ? '품절' : <Price pay={item.price - Math.min(unitDiscountFor({ itemId: item.id, title: item.title }, item.price), item.price)} list={item.price} />}
        </span>
      </button>
      {/* 사진을 눌러도 담긴다 (사장님 11-19 「카드를 그냥 눌러도 메뉴 추가될수있도록」) */}
      <div className="relative h-[92px] w-[92px] shrink-0 self-center" onClick={onOpen}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full rounded-xl bg-zinc-100 object-cover" />
        ) : (
          <div className="h-full w-full rounded-xl bg-zinc-100" />
        )}
        {item.soldOut ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-zinc-900/55 text-sm font-bold text-white">품절</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuick();
            }}
            aria-label={`${item.title} 담기`}
            className="absolute -bottom-2 -right-2 flex h-11 min-w-11 items-center justify-center rounded-full bg-white px-2 text-sm font-bold text-brand-dark shadow-md ring-1 ring-zinc-200 transition active:scale-95"
          >
            {inCart > 0 ? inCart : <Plus className="h-5 w-5" strokeWidth={2.5} />}
          </button>
        )}
      </div>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-3 pt-8">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[116px] animate-pulse rounded-2xl bg-zinc-200/60" />
      ))}
    </div>
  );
}
