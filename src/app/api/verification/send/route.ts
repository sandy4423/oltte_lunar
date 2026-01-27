/**
 * 인증번호 발송 API
 * POST /api/verification/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendSMS, createVerificationSMS } from '@/lib/sms';

// Node.js 런타임 사용 (crypto 모듈 필요)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] 인증번호 발송 요청 시작');
    const { phone } = await request.json();
    console.log('[API] 요청 전화번호:', phone);

    // 전화번호 정규화
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    console.log('[API] 정규화된 전화번호:', normalizedPhone);

    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 3자리 인증번호 생성
    const code = Math.floor(100 + Math.random() * 900).toString();
    console.log('[API] 인증번호 생성:', code);

    // Supabase에 인증 코드 저장 (5분 만료)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 기존 인증번호 삭제 (같은 번호)
    await supabase
      .from('verification_codes')
      .delete()
      .eq('phone', normalizedPhone);

    // 새 인증번호 저장
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        phone: normalizedPhone,
        code: code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (dbError) {
      console.error('[API] DB 저장 오류:', dbError);
      return NextResponse.json(
        { error: '인증번호 저장 실패' },
        { status: 500 }
      );
    }

    console.log('[API] DB 저장 성공');

    // SMS 발송
    console.log('[API] SMS 발송 시작');
    const smsText = createVerificationSMS(code);
    console.log('[API] SMS 텍스트:', smsText);
    const smsResult = await sendSMS(normalizedPhone, smsText);
    console.log('[API] SMS 결과:', smsResult);

    if (!smsResult.success) {
      console.error('[API] SMS 발송 실패:', smsResult.error);
      return NextResponse.json(
        { error: `SMS 발송 실패: ${smsResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API] 인증번호 발송 오류:', errorMessage, error);
    return NextResponse.json(
      { error: `서버 오류: ${errorMessage}` },
      { status: 500 }
    );
  }
}
