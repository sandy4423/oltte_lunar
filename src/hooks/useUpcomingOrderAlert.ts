'use client';

/**
 * 예약 픽업 20분 전 음성 알림 훅
 *
 * 30초마다 admin.orders 를 스캔해서 PAID 상태의 오늘 픽업 주문 중
 * 픽업 시간 20분 전이 된 건이 있으면 TTS로 알림.
 *
 * - 배달 주문은 시간 필드가 없어 제외
 * - sessionStorage 기반 중복 방지 (탭 세션 단위)
 * - stale guard: alertAt + 10분 이후로는 발화하지 않음
 */

import { useEffect, useRef } from 'react';
import { speakText } from '@/lib/clientTts';
import type { OrderFull, ProductSku } from '@/types/database';

const SKU_LABELS: Record<ProductSku, string> = {
  meat: '고기만두',
  kimchi: '김치만두',
  half: '반반만두',
  ricecake_1kg: '떡국떡',
  broth_1200ml: '양지육수',
  hotpot_cool: '시원 만두전골',
  hotpot_spicy: '얼큰 만두전골',
  broth_add: '육수 추가',
  dumpling_add: '만두 추가',
  noodle: '칼국수',
};

function summarizeMenu(items: OrderFull['order_items'] | undefined): string {
  if (!items || items.length === 0) return '';
  return items
    .map(item => {
      const label = SKU_LABELS[item.sku as ProductSku] || item.sku;
      return `${label} ${item.qty}개`;
    })
    .join(', ');
}

const LEAD_MINUTES = 20;
const STALE_GUARD_MINUTES = 10;
const SCAN_INTERVAL_MS = 30_000;
const FIRED_STORAGE_KEY = 'upcoming-alert-fired-v1';

function loadFiredSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(FIRED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistFiredSet(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* quota 초과 등 무시 */
  }
}

/** 'YYYY-MM-DD' KST 오늘 */
function todayKstDateStr(): string {
  const now = new Date();
  // KST = UTC+9
  const kstMs = now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60 * 1000;
  const kst = new Date(kstMs);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useUpcomingOrderAlert(orders: OrderFull[], enabled: boolean) {
  const ordersRef = useRef<OrderFull[]>(orders);
  ordersRef.current = orders;

  useEffect(() => {
    if (!enabled) return;

    const firedSet = loadFiredSet();

    const tick = () => {
      const now = new Date();
      const today = todayKstDateStr();
      const leadMs = LEAD_MINUTES * 60 * 1000;
      const staleMs = STALE_GUARD_MINUTES * 60 * 1000;

      for (const order of ordersRef.current) {
        if (!order.is_pickup) continue;
        if (order.status !== 'PAID') continue;
        if (!order.pickup_date || !order.pickup_time) continue;
        if (order.pickup_date !== today) continue;
        if (firedSet.has(order.id)) continue;

        const pickupAt = new Date(`${order.pickup_date}T${order.pickup_time}:00+09:00`);
        if (isNaN(pickupAt.getTime())) continue;

        const alertAt = pickupAt.getTime() - leadMs;
        const nowMs = now.getTime();

        if (nowMs >= alertAt && nowMs < alertAt + staleMs) {
          const menuPart = summarizeMenu(order.order_items);
          const message = menuPart
            ? `픽업 20분 전! ${order.pickup_time} 예약, ${menuPart}`
            : `픽업 20분 전! ${order.pickup_time} 예약 건 있습니다`;
          speakText(message);

          firedSet.add(order.id);
          persistFiredSet(firedSet);
          // 동시에 여러 건 발화 방지 — 한 tick에 한 건만
          break;
        }
      }
    };

    // 최초 1회 즉시 실행 후 주기 스캔
    tick();
    const intervalId = window.setInterval(tick, SCAN_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled]);
}
