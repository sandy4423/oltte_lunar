/**
 * 인증번호 검증 API
 * POST /api/verification/verify
 *
 * 무차별 대입 방지: IP당 10분 30번(rate_limit_hit) + 가장 최근 인증번호 한 줄당 5번 틀리면 잠김(verify_phone_code).
 * 둘 다 DB 함수이며, 함수가 없거나 오류면 막는다(503, fail closed).
 * 성공하면 번호 인증 쿠키(30분)를 준다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { normalizePhone } from '@/lib/utils';
import { setPhoneSession } from '@/lib/orderAccess.server';
import { getClientIp, rateLimitHit, failClosed503, TRY_LATER_MESSAGE } from '@/lib/rateLimit.server';

// Node.js 런타임 사용
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    const normalizedPhone = normalizePhone(String(phone ?? ''));

    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 인증번호 검증 (숫자 6자리만)
    if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
      return NextResponse.json(
        { error: '인증번호 6자리를 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase: any = createServerSupabaseClient();

    let result: unknown;
    try {
      const allowed = await rateLimitHit(`verify-ip:${getClientIp(request)}`, 30, 600);
      if (!allowed) {
        return NextResponse.json({ error: TRY_LATER_MESSAGE }, { status: 429 });
      }
      const { data, error } = await supabase.rpc('verify_phone_code', {
        p_phone: normalizedPhone,
        p_code: code,
      });
      if (error) throw new Error(error.message);
      result = data;
    } catch (e) {
      return failClosed503('인증번호 확인', e instanceof Error ? e.message : String(e));
    }

    if (result === 'ok') {
      // 인증한 브라우저에 번호 인증 쿠키(30분)를 준다 — 내 주문·취소·수령시간·손님 정보는 이 쿠키만 믿는다
      const res = NextResponse.json({
        success: true,
        message: '인증이 완료되었습니다.',
      });
      setPhoneSession(res, normalizedPhone);
      return res;
    }
    if (result === 'locked') {
      return NextResponse.json({ error: TRY_LATER_MESSAGE }, { status: 429 });
    }
    if (result === 'expired') {
      return NextResponse.json({ error: '인증번호를 다시 받아 주세요' }, { status: 400 });
    }
    if (result === 'wrong') {
      return NextResponse.json({ error: '인증번호가 맞지 않아요' }, { status: 400 });
    }
    return failClosed503('인증번호 확인', `예상 밖 응답: ${String(result)}`);
  } catch (error) {
    console.error('인증번호 검증 오류:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
