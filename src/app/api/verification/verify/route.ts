/**
 * 인증번호 검증 API
 * POST /api/verification/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { normalizePhone } from '@/lib/utils';
import { setPhoneSession } from '@/lib/orderAccess.server';

const FAIL_MARK = '__fail__'; // 틀린 시도 표시 줄 (새 열 없이 횟수 제한)
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 10 * 60 * 1000;

// Node.js 런타임 사용
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase: any = createServerSupabaseClient();
    const { phone, code } = await request.json();

    const normalizedPhone = normalizePhone(String(phone ?? ''));

    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 인증번호 검증 (숫자 4자리만 — '__fail__' 표시 줄과 절대 겹치지 않게)
    if (typeof code !== 'string' || !/^[0-9]{4}$/.test(code)) {
      return NextResponse.json(
        { error: '인증번호 4자리를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 무차별 대입 방지: 번호당 10분에 5번 틀리면 잠시 막는다 (막힌 동안은 번호를 확인하지 않음)
    const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
    const { count: failCount } = await supabase
      .from('verification_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone', normalizedPhone)
      .eq('code', FAIL_MARK)
      .gte('created_at', since);

    if ((failCount ?? 0) >= MAX_FAILS) {
      return NextResponse.json(
        { error: '잠시 후 다시 시도해 주세요.' },
        { status: 429 }
      );
    }

    const recordFail = async () => {
      await supabase.from('verification_codes').insert({
        phone: normalizedPhone,
        code: FAIL_MARK,
        verified: false,
        expires_at: new Date().toISOString(),
      });
    };

    // DB에서 가장 최근 인증번호 조회
    const { data: rows, error } = await supabase
      .from('verification_codes')
      .select('id, expires_at')
      .eq('phone', normalizedPhone)
      .eq('code', code)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const data = rows && rows.length > 0 ? rows[0] : null;

    if (error || !data) {
      await recordFail();
      return NextResponse.json(
        { error: '인증번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 만료 시간 확인
    const expiresAt = new Date(data.expires_at);
    if (new Date() > expiresAt) {
      await recordFail();
      return NextResponse.json(
        { error: '인증번호가 만료되었습니다.' },
        { status: 400 }
      );
    }

    // 인증 완료 처리 (이 줄만)
    await supabase
      .from('verification_codes')
      .update({ verified: true })
      .eq('id', data.id);

    // 인증한 브라우저에 번호 인증 쿠키(30분)를 준다 — 이후 내 주문·취소·수령시간·손님 정보는 이 쿠키만 믿는다
    const res = NextResponse.json({
      success: true,
      message: '인증이 완료되었습니다.',
    });
    setPhoneSession(res, normalizedPhone);
    return res;
  } catch (error) {
    console.error('인증번호 검증 오류:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
