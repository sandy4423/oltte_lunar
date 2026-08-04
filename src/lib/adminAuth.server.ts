/**
 * 관리자 인증 — 서버 전용 모듈
 *
 * 이 파일은 절대 클라이언트 컴포넌트에서 import 하지 마라.
 * (node:crypto + service_role DB 접근)
 * 클라이언트에서는 '@/lib/adminAuth' 의 getAdminPassword() 를 사용한다.
 *
 * 인증 방식:
 *   클라이언트가 x-admin-password 헤더로 보낸 값을
 *   staff_accounts 의 is_active = true 인 계정 비밀번호들과 대조한다.
 *   공유 비밀번호(환경변수) 방식은 폐기했다 — 직원마다 비밀번호가 다르므로
 *   공유 비밀번호는 우연히 값이 일치한 한 명만 통과시켰다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 활성 계정 비밀번호 캐시 TTL.
 *
 * ⚠️ 캐시 때문에 staff_accounts 변경(계정 비활성화·비밀번호 변경·계정 삭제)이
 *    반영되기까지 최대 60초가 걸린다. 즉 퇴사자 계정을 비활성화해도
 *    최대 60초 동안은 기존 비밀번호로 관리자 API 접근이 가능하다.
 *    즉시 차단이 필요하면 invalidateAdminAuthCache() 를 호출하거나
 *    이 값을 0으로 낮춰라.
 */
const CACHE_TTL_MS = 60_000;

let cachedPasswords: string[] | null = null;
let cacheExpiresAt = 0;

/** 401 응답 생성 (실패 사유를 클라이언트에 구분해서 노출하지 않음) */
function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: '관리자 인증이 필요합니다.' },
    { status: 401 }
  );
}

/**
 * 타이밍 공격에 안전한 문자열 비교.
 * timingSafeEqual은 길이가 다르면 예외를 던지므로 길이 검사를 먼저 하고,
 * 길이가 달라도 동일한 연산을 수행해 조기 반환 편차를 줄인다.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    // 더미 비교로 연산량을 맞춘 뒤 실패 반환
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * 활성 계정들의 비밀번호 목록 조회 (60초 캐시).
 *
 * @returns 비밀번호 배열, 조회 실패 시 null (호출부는 fail-closed 처리)
 */
async function getActivePasswords(): Promise<string[] | null> {
  const now = Date.now();

  if (cachedPasswords !== null && now < cacheExpiresAt) {
    return cachedPasswords;
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('staff_accounts')
      .select('password')
      .eq('is_active', true);

    if (error || !data) {
      // 비밀번호 값은 절대 로그에 남기지 않는다
      console.error(
        '[adminAuth] staff_accounts 조회 실패 — 요청을 거부합니다.',
        error?.message ?? 'no data'
      );
      return null;
    }

    // Database 제네릭이 supabase-js 버전 차이로 never 로 추론되므로 명시 캐스팅
    const rows = data as unknown as Array<{ password: string | null }>;

    const passwords = rows
      .map((row) => row.password)
      .filter((pw): pw is string => typeof pw === 'string' && pw.length > 0);

    cachedPasswords = passwords;
    cacheExpiresAt = now + CACHE_TTL_MS;

    return passwords;
  } catch (err) {
    console.error(
      '[adminAuth] staff_accounts 조회 중 예외 — 요청을 거부합니다.',
      err instanceof Error ? err.message : 'unknown error'
    );
    return null;
  }
}

/**
 * 관리자 인증 검증 (서버 API용)
 *
 * fail-closed: 헤더가 없거나, DB 조회에 실패하거나, 활성 계정이 하나도 없으면 401.
 *
 * @param request - NextRequest 객체
 * @returns null이면 인증 성공, NextResponse면 인증 실패 응답
 */
export async function verifyAdminAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const password = request.headers.get('x-admin-password');

  if (!password) {
    return unauthorized();
  }

  const activePasswords = await getActivePasswords();

  // 조회 실패(null) 또는 활성 계정 없음 → 무조건 거부
  if (activePasswords === null || activePasswords.length === 0) {
    return unauthorized();
  }

  // 어느 계정과 일치했는지 타이밍으로 드러나지 않도록 조기 종료 없이 전부 비교
  let matched = false;
  for (const candidate of activePasswords) {
    if (safeEqual(password, candidate)) {
      matched = true;
    }
  }

  return matched ? null : unauthorized();
}

/**
 * 비밀번호 캐시 즉시 무효화.
 * 계정 추가·수정·삭제 후 호출하면 다음 요청부터 최신 상태가 반영된다.
 */
export function invalidateAdminAuthCache(): void {
  cachedPasswords = null;
  cacheExpiresAt = 0;
}
