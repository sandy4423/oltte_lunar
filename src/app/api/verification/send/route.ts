/**
 * 인증번호 발송 API
 * POST /api/verification/send
 *
 * 횟수 제한(DB 함수 rate_limit_hit): 번호당 1시간 5번, IP당 1시간 10번, 전체 하루 300번.
 * DB 함수가 없거나 오류면 막는다(503, fail closed). 인증번호는 6자리 난수(crypto.randomInt).
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendSMS, createVerificationSMS } from '@/lib/sms';
import { normalizePhone } from '@/lib/utils';
import { TEST_PHONE_NUMBER, TEST_VERIFICATION_CODE } from '@/lib/constants';
import { getClientIp, rateLimitHit, failClosed503, TRY_LATER_MESSAGE } from '@/lib/rateLimit.server';

// Node.js 런타임 사용 (crypto 모듈 필요)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase: any = createServerSupabaseClient();
    const { phone } = await request.json();

    const normalizedPhone = normalizePhone(String(phone ?? ''));

    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 테스트 번호 우회는 개발 환경에서만 (운영에서는 이 번호도 일반 번호처럼 취급)
    const isTestPhone = process.env.NODE_ENV !== 'production' && normalizedPhone === TEST_PHONE_NUMBER;

    // 문자 폭탄·문자비 방지 (테스트 번호는 문자를 안 보내므로 제외)
    if (!isTestPhone) {
      const ip = getClientIp(request);
      try {
        const okPhone = await rateLimitHit(`sms-phone:${normalizedPhone}`, 5, 3600);
        const okIp = okPhone && (await rateLimitHit(`sms-ip:${ip}`, 10, 3600));
        const okAll = okIp && (await rateLimitHit('sms-all', 300, 86400));
        if (!okAll) {
          return NextResponse.json({ error: TRY_LATER_MESSAGE }, { status: 429 });
        }
      } catch (e) {
        return failClosed503('인증번호 보내기', e instanceof Error ? e.message : String(e));
      }
    }

    // 6자리 인증번호 (테스트 번호는 고정 값)
    const code = isTestPhone
      ? TEST_VERIFICATION_CODE
      : String(randomInt(0, 1000000)).padStart(6, '0');

    // Supabase에 인증 코드 저장 (5분 만료)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 이전 인증번호는 지우지 않고 만료 처리한다 (최신 줄 하나만 유효하게)
    await supabase
      .from('verification_codes')
      .update({ expires_at: new Date().toISOString() })
      .eq('phone', normalizedPhone)
      .eq('verified', false);

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
      console.error('[API] DB 저장 오류:', dbError.message);
      return NextResponse.json(
        { error: '인증번호 저장 실패' },
        { status: 500 }
      );
    }

    // SMS 발송 (테스트 번호는 스킵)
    if (!isTestPhone) {
      const smsText = createVerificationSMS(code);
      const smsResult = await sendSMS(normalizedPhone, smsText);

      if (!smsResult.success) {
        console.error('[API] SMS 발송 실패:', smsResult.error);
        return NextResponse.json(
          { error: '인증번호 문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
          { status: 500 }
        );
      }
    } else {
      console.log('[API] 테스트 전화번호 - SMS 발송 스킵');
    }

    return NextResponse.json({
      success: true,
      message: isTestPhone ? '테스트 계정 - 인증번호가 자동으로 입력됩니다.' : '인증번호가 발송되었습니다.',
      isTestPhone, // 프론트엔드에서 자동 인증 트리거용
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API] 인증번호 발송 오류:', errorMessage);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
