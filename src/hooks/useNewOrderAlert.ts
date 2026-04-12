'use client';

/**
 * 신규 주문 소리 알림 훅
 *
 * Supabase Realtime으로 orders 테이블 INSERT를 감지하여
 * ElevenLabs TTS로 날짜, 시간, 메뉴를 포함한 알림을 재생합니다.
 * ElevenLabs 호출 실패 시 브라우저 내장 Web Speech API로 자동 폴백.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getAdminPassword } from '@/lib/adminAuth';
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

export function useNewOrderAlert(enabled: boolean) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  /** 기존에 재생 중인 오디오 정리 */
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
  }, []);

  /** Web Speech API 폴백 */
  const speakWithBrowserTTS = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1;
    utterance.volume = 1;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  /** ElevenLabs TTS 호출 → 실패 시 Web Speech API 폴백 */
  const speak = useCallback(async (text: string) => {
    if (typeof window === 'undefined') return;

    stopCurrentAudio();

    try {
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPassword(),
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS API ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 1;

      currentAudioRef.current = audio;
      currentAudioUrlRef.current = url;

      const cleanup = () => {
        if (currentAudioUrlRef.current === url) {
          URL.revokeObjectURL(url);
          currentAudioUrlRef.current = null;
          currentAudioRef.current = null;
        }
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;

      await audio.play();
    } catch (err) {
      console.warn('[TTS] ElevenLabs 실패, Web Speech API로 폴백:', err);
      speakWithBrowserTTS(text);
    }
  }, [stopCurrentAudio, speakWithBrowserTTS]);

  const announceOrder = useCallback(async (orderId: string, order: Record<string, any>) => {
    // 날짜: 픽업 주문이면 pickup_date, 아니면 delivery_date
    const dateStr = order.is_pickup && order.pickup_date
      ? order.pickup_date
      : order.delivery_date;
    const datePart = dateStr ? formatDate(dateStr) : '';

    // 시간: 픽업 주문이면 pickup_time
    const timePart = order.is_pickup && order.pickup_time
      ? ` ${order.pickup_time}` : '';

    // 메뉴: order_items 조회
    let menuPart = '';
    const { data: items } = await supabase
      .from('order_items')
      .select('sku, qty')
      .eq('order_id', orderId);

    if (items && items.length > 0) {
      menuPart = ', ' + items
        .map(item => {
          const label = SKU_LABELS[item.sku as ProductSku] || item.sku;
          return `${label} ${item.qty}개`;
        })
        .join(', ');
    }

    const message = `전골 예약 주문! ${datePart}${timePart}${menuPart}`;
    speak(message);
  }, [speak]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('new-order-alert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new;
          if (order?.id) {
            announceOrder(order.id, order);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      stopCurrentAudio();
    };
  }, [enabled, speak, announceOrder, stopCurrentAudio]);
}
