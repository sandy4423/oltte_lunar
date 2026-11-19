/**
 * 자체앱 카카오 로그인 (서버 전용) — 과일 앱(oltte-bookkeeping)과 같은 Supabase 카카오 로그인(공급자 kakao)을 쓴다.
 * 흐름: 브라우저가 Supabase OAuth 로 카카오 로그인 → /menu/kakao/callback 이 access token 을 /api/menu/kakao 로 보냄
 *       → 여기서 토큰을 Supabase 로 검증해 카카오 계정 id 를 얻고, 번호를 알면 인증·기억 쿠키를 준다.
 * 번호는 ① 카카오가 준 번호(동의항목이 켜진 경우) ② 표 jache_kakao_link(첫 주문 때 문자 인증으로 묶은 번호) 순으로 찾는다.
 * ⛔ 번호·토큰은 로그에 찍지 않는다. 표가 없어도 에러를 삼킨다(문자 인증으로 이어짐).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { orderTokenSecret } from '@/lib/orderAccess.server';

export const kakaoEnabled = () => process.env.JACHE_KAKAO === '1';

export const KAKAO_PENDING_COOKIE = 'jache_kakao_pending';
const PENDING_TTL_S = 24 * 3600;

const sign = (p: string) => createHmac('sha256', orderTokenSecret()).update(`jache-kakao:${p}`).digest('base64url');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 「+82 10-1234-5678」·「01012345678」 → 01012345678, 아니면 null */
export function normalizeKakaoPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let d = raw.replace(/[^0-9+]/g, '');
  if (d.startsWith('+82')) d = '0' + d.slice(3);
  d = d.replace(/\D/g, '');
  return /^010\d{8}$/.test(d) ? d : null;
}

/** 토큰을 Supabase 에 물어 카카오 계정 id 와 (있으면) 카카오가 준 번호를 얻는다. 카카오 계정이 아니면 null */
export async function verifyKakaoToken(accessToken: string): Promise<{ id: string; phone: string | null } | null> {
  if (!accessToken || accessToken.length > 4096) return null;
  try {
    const { data, error } = await createServerSupabaseClient().auth.getUser(accessToken);
    const u = data?.user;
    if (error || !u || !UUID.test(u.id)) return null;
    const providers = Array.isArray(u.app_metadata?.providers) ? (u.app_metadata.providers as unknown[]) : [];
    if (u.app_metadata?.provider !== 'kakao' && !providers.includes('kakao')) return null;
    const m = (u.user_metadata ?? {}) as Record<string, unknown>;
    return { id: u.id, phone: normalizeKakaoPhone(m.phone_number) ?? normalizeKakaoPhone(u.phone) };
  } catch {
    return null;
  }
}

export async function loadKakaoPhone(authUserId: string): Promise<string | null> {
  try {
    const { data, error } = await (createServerSupabaseClient() as any)
      .from('jache_kakao_link')
      .select('phone')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    const p = data?.phone;
    return !error && typeof p === 'string' && /^010\d{8}$/.test(p) ? p : null;
  } catch {
    return null;
  }
}

export async function saveKakaoLink(authUserId: string, phone: string): Promise<boolean> {
  if (!UUID.test(authUserId) || !/^010\d{8}$/.test(phone)) return false;
  try {
    const { error } = await (createServerSupabaseClient() as any)
      .from('jache_kakao_link')
      .upsert({ auth_user_id: authUserId, phone, updated_at: new Date().toISOString() }, { onConflict: 'auth_user_id' });
    return !error;
  } catch {
    return false;
  }
}

/** 번호를 아직 모르는 카카오 손님 표시 — 첫 주문 때 문자 인증한 번호와 묶는다. 서명된 쿠키(하루) */
export function setKakaoPending(res: NextResponse, authUserId: string): void {
  const payload = `${authUserId}.${Math.floor(Date.now() / 1000) + PENDING_TTL_S}`;
  res.cookies.set(KAKAO_PENDING_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_TTL_S,
  });
}

export function getKakaoPending(req: NextRequest): string | null {
  const v = req.cookies.get(KAKAO_PENDING_COOKIE)?.value;
  if (!v) return null;
  const [id, exp, sig] = v.split('.');
  if (!id || !exp || !sig || !UUID.test(id) || !/^\d+$/.test(exp) || Number(exp) * 1000 < Date.now()) return null;
  const want = Buffer.from(sign(`${id}.${exp}`));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

export function clearKakaoPending(res: NextResponse): void {
  res.cookies.set(KAKAO_PENDING_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}
