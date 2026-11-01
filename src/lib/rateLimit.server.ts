/**
 * 횟수 제한 — 서버 전용 (DB 함수 rate_limit_hit 사용, migrations/20261102_auth_rate_limits.sql)
 *
 * fail closed: DB 함수가 없거나 오류가 나면(마이그레이션 미적용 등) 막고 503 을 돌려준다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendSlackMessage, createErrorAlert } from '@/lib/slack';

/** 손님 IP: x-forwarded-for 첫 값(Vercel 이 채움) → x-real-ip → 'unknown' */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real && real.trim()) return real.trim();
  return 'unknown';
}

export class RateLimitUnavailableError extends Error {}

/** true = 통과(기록됨), false = 한도 초과. DB 오류는 RateLimitUnavailableError 로 던진다. */
export async function rateLimitHit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const supabase: any = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('rate_limit_hit', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || typeof data !== 'boolean') {
    throw new RateLimitUnavailableError(error?.message || 'rate_limit_hit 응답 이상');
  }
  return data;
}

export const TRY_LATER_MESSAGE = '잠시 후 다시 시도해 주세요.';

/** 503 + 슬랙 알림(요청당 1번, 비밀값 없음) */
export async function failClosed503(where: string, reason: string): Promise<NextResponse> {
  console.error(`[RateLimit] ${where} unavailable:`, reason);
  await sendSlackMessage(
    createErrorAlert({
      errorType: `횟수 제한 DB 함수 오류 (${where}) — 요청 차단됨`,
      errorMessage: reason,
      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    })
  ).catch((e) => console.error('[Error Alert]', e));
  return NextResponse.json({ error: TRY_LATER_MESSAGE }, { status: 503 });
}
