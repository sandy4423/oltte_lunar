/**
 * 페이지 방문 추적 유틸리티
 */

import { getStoredSource } from './sourceTracking';

export async function trackPageView(page: string, aptCode?: string) {
  try {
    const source = getStoredSource();
    
    await fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page,
        aptCode,
        source,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }),
    });
  } catch (error) {
    // 에러 무시 (분석 실패가 사용자 경험에 영향 주지 않도록)
    console.error('[Analytics] Page view tracking failed:', error);
  }
}
