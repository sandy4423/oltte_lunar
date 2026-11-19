/**
 * 자체앱: 카카오 로그인 마무리. POST { accessToken } → { phone }
 *  - 번호를 알면(카카오가 줌 / 이전 주문에서 묶어 둠) 인증 쿠키(30분)·기억 쿠키(180일)를 주고 번호를 돌려준다
 *  - 모르면 「묶을 카카오 계정」 쿠키만 주고 phone null → 화면은 문자 인증으로 이어지고, 첫 주문이 성공하면 그 번호를 묶는다
 * 스위치 JACHE_KAKAO=1 이 아니면 404.
 */
import { NextRequest, NextResponse } from 'next/server';
import { setPhoneSession } from '@/lib/orderAccess.server';
import { setRemember } from '@/lib/jache/remember.server';
import { kakaoEnabled, loadKakaoPhone, setKakaoPending, verifyKakaoToken } from '@/lib/jache/kakao.server';

export const dynamic = 'force-dynamic';
const H = { 'Cache-Control': 'no-store' };

export async function POST(req: NextRequest) {
  if (!kakaoEnabled()) return NextResponse.json({ phone: null }, { status: 404, headers: H });
  let token = '';
  try {
    const b = await req.json();
    if (b?.clientError) {
      console.error('[jache-kakao] callback 실패:', String(b.clientError).slice(0, 200));
      return NextResponse.json({ phone: null }, { headers: H });
    }
    token = String(b?.accessToken ?? '');
  } catch {
    /* 빈 본문 */
  }
  const user = await verifyKakaoToken(token);
  if (!user) {
    console.error('[jache-kakao] 토큰 확인 실패');
    return NextResponse.json({ phone: null }, { status: 401, headers: H });
  }
  console.log('[jache-kakao] 로그인');

  // 번호는 문자 인증으로 묶어 둔 것만 믿는다(카카오 계정 정보의 번호는 손님이 고칠 수 있어 쓰지 않음)
  const phone = await loadKakaoPhone(user.id);

  const res = NextResponse.json({ phone }, { headers: H });
  if (phone) {
    setPhoneSession(res, phone);
    setRemember(res, phone);
  } else {
    setKakaoPending(res, user.id);
  }
  return res;
}
