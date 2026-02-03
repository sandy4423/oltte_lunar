/**
 * 유입 경로 추적 유틸리티
 */

import type { TrafficSource } from '@/types/source';
import { isValidSource } from '@/types/source';

const SOURCE_STORAGE_KEY = 'traffic_source';

/**
 * URL에서 source 파라미터를 읽어 sessionStorage에 저장
 */
export function captureSource(searchParams: URLSearchParams): void {
  const source = searchParams.get('source');
  
  if (source && isValidSource(source)) {
    sessionStorage.setItem(SOURCE_STORAGE_KEY, source);
  }
}

/**
 * 저장된 유입 경로 가져오기
 */
export function getStoredSource(): TrafficSource | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(SOURCE_STORAGE_KEY);
  return isValidSource(stored) ? stored : null;
}

/**
 * 유입 경로 초기화 (테스트용)
 */
export function clearSource(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SOURCE_STORAGE_KEY);
}
