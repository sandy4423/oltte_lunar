/**
 * 인증번호 검증 API
 * POST /api/verification/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    // 전화번호 정규화
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 인증번호 검증
    if (!code || code.length !== 3) {
      return NextResponse.json(
        { error: '인증번호 3자리를 입력해주세요.' },
        { status: 400 }
      );
    }

    // DB에서 인증번호 조회
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('code', code)
      .eq('verified', false)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '인증번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 만료 시간 확인
    const expiresAt = new Date(data.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: '인증번호가 만료되었습니다.' },
        { status: 400 }
      );
    }

    // 인증 완료 처리
    await supabase
      .from('verification_codes')
      .update({ verified: true })
      .eq('phone', normalizedPhone)
      .eq('code', code);

    return NextResponse.json({
      success: true,
      message: '인증이 완료되었습니다.',
    });
  } catch (error) {
    console.error('인증번호 검증 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
