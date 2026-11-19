'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import type { CartChoice, CartLine, MenuItem, MenuOptionGroup } from '@/lib/jache/types';
import { lineKey, won } from '@/lib/jache/cart';
import { unitDiscountFor } from '@/lib/jache/discounts';
import { Price } from './Price';

type Picked = Record<string, Record<string, number>>; // optionId -> choiceId -> qty

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}

const groupCount = (p: Picked, g: MenuOptionGroup) => Object.keys(p[g.id] ?? {}).length;
const groupMet = (p: Picked, g: MenuOptionGroup) => !g.required || groupCount(p, g) >= Math.max(1, g.min);

export function ItemSheet({ item, onClose, onAdd }: Props) {
  const [picked, setPicked] = useState<Picked>({});
  const [qty, setQty] = useState(1);
  const [shake, setShake] = useState<string | null>(null);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const toggle = (g: MenuOptionGroup, choiceId: string) => {
    setPicked((prev) => {
      const cur = { ...(prev[g.id] ?? {}) };
      if (cur[choiceId]) {
        delete cur[choiceId];
      } else if (g.max === 1) {
        for (const k of Object.keys(cur)) delete cur[k];
        cur[choiceId] = 1;
      } else if (Object.keys(cur).length < g.max) {
        cur[choiceId] = 1;
      }
      return { ...prev, [g.id]: cur };
    });
  };

  const setChoiceQty = (g: MenuOptionGroup, choiceId: string, q: number) =>
    setPicked((prev) => ({ ...prev, [g.id]: { ...(prev[g.id] ?? {}), [choiceId]: q } }));

  const choices: CartChoice[] = useMemo(
    () =>
      item.optionGroups.flatMap((g) =>
        g.choices
          .filter((c) => picked[g.id]?.[c.id])
          .map((c) => ({ optionId: g.id, optionTitle: g.title, choiceId: c.id, title: c.title, price: c.price, qty: picked[g.id][c.id] }))
      ),
    [item, picked]
  );

  const unitList = item.price + choices.reduce((s, c) => s + c.price * c.qty, 0);
  const unit = unitList - Math.min(unitDiscountFor({ itemId: item.id, title: item.title }, unitList), unitList);
  const baseDiscount = Math.min(unitDiscountFor({ itemId: item.id, title: item.title }, item.price), item.price);

  const submit = () => {
    const bad = item.optionGroups.find((g) => !groupMet(picked, g));
    if (bad) {
      groupRefs.current[bad.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShake(bad.id);
      setTimeout(() => setShake(null), 900);
      return;
    }
    onAdd({ key: lineKey(item.id, choices), itemId: item.id, title: item.title, basePrice: item.price, imageUrl: item.imageUrl, qty, choices });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={item.title}>
      <button aria-label="닫기" className="absolute inset-0 bg-zinc-900/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">

        <div className="relative overflow-y-auto overscroll-contain">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow ring-1 ring-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.title} className="aspect-[16/10] w-full bg-zinc-100 object-cover" />
          )}
          <div className="px-5 pb-4 pt-5">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">{item.title}</h2>
            {item.description && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-zinc-500">{item.description}</p>}
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              <Price pay={item.price - baseDiscount} list={item.price} />
            </p>
          </div>

          {item.optionGroups.map((g) => {
            const met = groupMet(picked, g);
            return (
              <section
                key={g.id}
                ref={(el) => {
                  groupRefs.current[g.id] = el;
                }}
                className={`border-t border-zinc-100 px-5 py-4 transition-colors ${shake === g.id ? 'bg-red-50' : ''}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-base font-semibold text-zinc-900">{g.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      g.required ? (met ? 'bg-zinc-100 text-zinc-500' : 'bg-orange-100 text-brand-dark') : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {g.required ? '필수' : g.max > 1 ? `최대 ${g.max}개` : '선택'}
                  </span>
                </div>
                <div className="space-y-2">
                  {g.choices.map((c) => {
                    const q = picked[g.id]?.[c.id] ?? 0;
                    const on = q > 0;
                    const radio = g.max === 1;
                    const full = !on && groupCount(picked, g) >= g.max && g.max > 1;
                    const disabled = c.soldOut || full;
                    return (
                      <div
                        key={c.id}
                        className={`flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 py-2 transition-colors ${
                          on ? 'border-brand-dark bg-orange-50' : 'border-zinc-200 bg-white'
                        } ${disabled ? 'opacity-45' : ''}`}
                      >
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggle(g, c.id)}
                          aria-pressed={on}
                          className="flex flex-1 items-center gap-3 py-1 text-left"
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 ${radio ? 'rounded-full' : 'rounded-md'} ${
                              on ? 'border-brand-dark bg-brand-dark text-white' : 'border-zinc-300'
                            }`}
                          >
                            {on && <Check className="h-4 w-4" strokeWidth={3} />}
                          </span>
                          <span className="flex-1 text-[15px] font-medium text-zinc-900">{c.title}</span>
                          <span className="text-sm text-zinc-500">{c.soldOut ? '품절' : c.price > 0 ? `+${won(c.price)}` : ''}</span>
                        </button>
                        {on && c.qtyEnabled && (
                          <Stepper small value={q} min={1} max={c.maxQty} onChange={(v) => setChoiceQty(g, c.id, v)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Stepper value={qty} min={1} max={20} onChange={setQty} />
          <button
            onClick={submit}
            className="h-14 flex-1 rounded-2xl bg-brand-dark text-base font-bold text-white transition active:scale-[0.98]"
          >
            담기 · {won(unit * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  small,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  small?: boolean;
}) {
  const size = small ? 'h-9 w-9' : 'h-12 w-12';
  const btn = `${size} flex items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 transition active:scale-95 disabled:opacity-30`;
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="줄이기" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="h-4 w-4" />
      </button>
      <span className={`${small ? 'w-6 text-sm' : 'w-8 text-base'} text-center font-semibold tabular-nums text-zinc-900`}>{value}</span>
      <button type="button" aria-label="늘리기" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
