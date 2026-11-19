/**
 * 자체앱: 이미 번호 인증을 마친 손님인지.
 *  - 인증 쿠키(30분)가 살아 있으면 그 번호 (결제 실패·취소로 돌아와도 다시 인증 안 함 — 사장님 11-19)
 *  - 없어도 「번호 기억」(180일, remember.server.ts)이 있으면 인증 쿠키를 새로 주고 그 번호 (「번호 저장해서 쉽게 주문하게」)
 * GET → { phone } / DELETE → 이 폰의 번호 기억·인증 지우기 (「번호 바꾸기」)
 */
import { NextRequest, NextResponse } from 'next/server';
import { clearPhoneSession, getSessionPhone, setPhoneSession } from '@/lib/orderAccess.server';
import { kakaoEnabled } from '@/lib/jache/kakao.server';
import { clearRemember, getRemember, setRemember } from '@/lib/jache/remember.server';

export const dynamic = 'force-dynamic';
const H = { 'Cache-Control': 'no-store' };

export async function GET(req: NextRequest) {
  const session = getSessionPhone(req);
  const remembered = getRemember(req);
  const phone = session ?? remembered;
  const res = NextResponse.json({ phone, kakao: kakaoEnabled() }, { headers: H });
  if (!session && remembered) setPhoneSession(res, remembered);
  if (session && session !== remembered) setRemember(res, session);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true }, { headers: H });
  clearRemember(res);
  clearPhoneSession(res);
  return res;
}
