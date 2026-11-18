'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CartLine } from '@/lib/jache/types';
import { cartCount, cartTotal } from '@/lib/jache/cart';

const STORAGE_KEY = 'jache-cart-v1';

function load(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 자체앱 주문 장바구니 — 브라우저 localStorage 에 보관 (막혀 있어도 화면은 동작) */
export function useJacheCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(load());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* 저장소 막힘 — 화면 상태만 유지 */
    }
  }, []);

  const update = useCallback(
    (fn: (prev: CartLine[]) => CartLine[]) => {
      setLines((prev) => {
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const add = useCallback(
    (line: CartLine) =>
      update((prev) => {
        const hit = prev.find((l) => l.key === line.key);
        if (hit) return prev.map((l) => (l.key === line.key ? { ...l, qty: Math.min(99, l.qty + line.qty) } : l));
        return [...prev, line];
      }),
    [update]
  );

  const setQty = useCallback(
    (key: string, qty: number) =>
      update((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(99, qty) } : l)))),
    [update]
  );

  const remove = useCallback((key: string) => update((prev) => prev.filter((l) => l.key !== key)), [update]);
  const clear = useCallback(() => update(() => []), [update]);

  return { lines, hydrated, add, setQty, remove, clear, count: cartCount(lines), total: cartTotal(lines) };
}
