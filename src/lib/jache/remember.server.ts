/**
 * 자체앱: 이 폰에서 한 번 휴대폰 인증하면 180일 동안 번호를 기억 (서버 전용).
 * 사장님 11-19 「카톡 로그인 활성화해. 번호 저장해서 쉽게 주문하게」 → 카카오 로그인은 번호를 못 줄 수 있고(동의항목 심사)
 * 개발자 설정이 필요해 먼저 이 방식으로 「다시 안 치게」를 만든다. 값 = 번호.만료.서명(HMAC). 다른 화면 권한에는 쓰지 않는다.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { orderTokenSecret } from '@/lib/orderAccess.server';

export const REMEMBER_COOKIE = 'jache_phone_remember';
const TTL_S = 180 * 24 * 3600;

const sign = (payload: string) => createHmac('sha256', orderTokenSecret()).update(`jache-remember:${payload}`).digest('base64url');

export function setRemember(res: NextResponse, phone: string): void {
  if (!/^010\d{8}$/.test(phone)) return;
  const payload = `${phone}.${Math.floor(Date.now() / 1000) + TTL_S}`;
  res.cookies.set(REMEMBER_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_S,
  });
}

export function getRemember(req: NextRequest): string | null {
  const v = req.cookies.get(REMEMBER_COOKIE)?.value;
  if (!v) return null;
  const [phone, exp, sig] = v.split('.');
  if (!phone || !exp || !sig || !/^010\d{8}$/.test(phone) || !/^\d+$/.test(exp)) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  const want = Buffer.from(sign(`${phone}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return phone;
}

export function clearRemember(res: NextResponse): void {
  res.cookies.set(REMEMBER_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}
