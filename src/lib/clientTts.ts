'use client';

/**
 * 클라이언트 TTS 유틸 — ElevenLabs → Web Speech API 폴백
 *
 * 모듈 싱글톤으로 현재 재생 중인 오디오를 관리하여
 * 여러 훅에서 공유 가능 (신규 주문 알림 + 예약 픽업 20분 전 알림 등)
 */

import { getAdminPassword } from '@/lib/adminAuth';

let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

/** 현재 재생 중인 TTS 오디오 중단 + 리소스 정리 */
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** 브라우저 내장 Web Speech API 폴백 */
function speakWithBrowserTTS(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 1;
  utterance.volume = 1;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

/**
 * 텍스트를 음성으로 재생.
 * ElevenLabs /api/tts/speak 를 호출하고, 실패 시 Web Speech API로 폴백.
 */
export async function speakText(text: string): Promise<void> {
  if (typeof window === 'undefined') return;

  stopSpeaking();

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

    currentAudio = audio;
    currentAudioUrl = url;

    const cleanup = () => {
      if (currentAudioUrl === url) {
        URL.revokeObjectURL(url);
        currentAudioUrl = null;
        currentAudio = null;
      }
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;

    await audio.play();
  } catch (err) {
    console.warn('[TTS] ElevenLabs 실패, Web Speech API로 폴백:', err);
    speakWithBrowserTTS(text);
  }
}
