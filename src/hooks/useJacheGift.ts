'use client';

import { useEffect, useState } from 'react';
import type { GiftItem } from '@/lib/jache/gift';

/** 15,000원 이상 증정 상품 (메뉴판에 없거나 품절이면 null → 안내 문구를 그리지 않는다). 못 불러와도 조용히 null */
export function useJacheGift(): GiftItem | null {
  const [gift, setGift] = useState<GiftItem | null>(null);
  useEffect(() => {
    let off = false;
    fetch('/api/menu')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !off && setGift(d?.gift ?? null))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  return gift;
}
