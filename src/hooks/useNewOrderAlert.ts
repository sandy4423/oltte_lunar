'use client';

/**
 * 신규 주문 소리 알림 훅
 *
 * 인증된 관리자 API(/api/admin/orders)를 12초마다 조회해 새로 결제(PAID)·입금대기(WAITING_FOR_DEPOSIT)가 된 주문을 감지하고
 * ElevenLabs TTS로 날짜, 시간, 메뉴를 포함한 알림을 재생합니다.
 * (2026-11-02 R5: 공개 키 실시간 구독·order_items 직접 읽기 제거 — 브라우저는 DB 를 직접 만지지 않는다)
 * 첫 조회는 기준선만 잡고 알리지 않는다. TTS 재생은 `@/lib/clientTts`의 공유 싱글톤 사용.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getAdminPassword } from '@/lib/adminAuth';
import { speakText, stopSpeaking } from '@/lib/clientTts';
import type { ProductSku } from '@/types/database';

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

const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES[d.getDay()];
}

interface UseNewOrderAlertOptions {
  onNewOrder?: () => void;
  onOrderUpdate?: () => void;
}

const POLL_INTERVAL_MS = 12_000;

export function useNewOrderAlert(enabled: boolean, options: UseNewOrderAlertOptions = {}) {
  const { onNewOrder, onOrderUpdate } = options;
  const onNewOrderRef = useRef(onNewOrder);
  const onOrderUpdateRef = useRef(onOrderUpdate);

  // 최신 콜백 참조 유지 (타이머 재생성 없이)
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
    onOrderUpdateRef.current = onOrderUpdate;
  }, [onNewOrder, onOrderUpdate]);

  const announceOrder = useCallback((order: Record<string, any>) => {
    // 날짜: 픽업 주문이면 pickup_date, 아니면 delivery_date
    const dateStr = order.is_pickup && order.pickup_date
      ? order.pickup_date
      : order.delivery_date;
    const datePart = dateStr ? formatDate(dateStr) : '';

    // 시간: 픽업 주문이면 pickup_time
    const timePart = order.is_pickup && order.pickup_time
      ? ` ${order.pickup_time}` : '';

    // 메뉴: 관리자 API 응답에 들어 있는 order_items 사용
    let menuPart = '';
    const items: Array<{ sku: string; qty: number }> = order.order_items || [];
    if (items.length > 0) {
      menuPart = ', ' + items
        .map(item => {
          const label = SKU_LABELS[item.sku as ProductSku] || item.sku;
          return `${label} ${item.qty}개`;
        })
        .join(', ');
    }

    speakText(`전골 예약 주문! ${datePart}${timePart}${menuPart}`);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let inFlight = false;
    // 이미 알린(또는 기준선으로 잡은) 주문 번호. null = 아직 첫 조회 전
    // 결제 전(CREATED) 주문은 알리지 않고, 나중에 PAID/WAITING_FOR_DEPOSIT 가 되면 그때 한 번만 알린다.
    let alertedIds: Set<string> | null = null;
    const ALERT_STATUSES = ['PAID', 'WAITING_FOR_DEPOSIT'];
    let lastSignature = '';

    const poll = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        const res = await fetch('/api/admin/orders', {
          headers: { 'x-admin-password': getAdminPassword() },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json?.success || !Array.isArray(json.data)) return;

        const orders: Array<Record<string, any>> = json.data;
        const signature = orders.map(o => `${o.id}:${o.status}:${o.updated_at}`).join('|');

        if (alertedIds === null) {
          alertedIds = new Set(
            orders.filter(o => ALERT_STATUSES.includes(o.status)).map(o => String(o.id))
          );
          lastSignature = signature;
          return;
        }

        const fresh = orders.filter(
          o => ALERT_STATUSES.includes(o.status) && !alertedIds!.has(String(o.id))
        );
        fresh.forEach(o => alertedIds!.add(String(o.id)));

        if (fresh.length > 0) {
          // 여러 건이 한꺼번에 들어와도 가장 오래된 것부터 차례로 안내
          fresh.reverse().forEach(o => announceOrder(o));
          onNewOrderRef.current?.();
        } else if (signature !== lastSignature) {
          // 다른 관리자/시스템에서 주문 상태가 바뀐 경우 갱신
          onOrderUpdateRef.current?.();
        }
        lastSignature = signature;
      } catch {
        // 네트워크 오류는 다음 주기에 다시 시도
      } finally {
        inFlight = false;
      }
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      stopSpeaking();
    };
  }, [enabled, announceOrder]);
}
