'use client';

/**
 * 신규 주문 소리 알림 훅
 *
 * Supabase Realtime으로 orders 테이블 INSERT를 감지하여
 * Web Speech API (TTS)로 "전골 예약 주문!" 알림을 재생합니다.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useNewOrderAlert(enabled: boolean) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // 이전 발화 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1;
    utterance.volume = 1;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

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
        () => {
          speak('전골 예약 주문!');
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, speak]);
}
