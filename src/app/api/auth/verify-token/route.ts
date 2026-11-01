/**
 * 일회용 인증 토큰 검증 API
 * GET /api/auth/verify-token?token={token}
 * 
 * 픽업시간 회신 링크에서 사용
 * 토큰이 유효하면 해당 고객의 전화번호를 반환하여 자동 인증 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { setPhoneSession } from '@/lib/orderAccess.server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // 토큰 파라미터 확인
    if (!token) {
      return NextResponse.json(
        { success: false, error: '토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase: any = createServerSupabaseClient();

    // 토큰 조회 (고객 정보 포함)
    const { data: tokenData, error: tokenError } = await supabase
      .from('one_time_auth_tokens')
      .select(`
        *,
        customer:customers (
          id,
          phone,
          name
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('[VerifyToken] Token not found');
      return NextResponse.json(
        { success: false, error: '유효하지 않은 링크입니다.' },
        { status: 404 }
      );
    }

    // 토큰 만료 확인
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      console.error('[VerifyToken] Token expired');
      return NextResponse.json(
        { success: false, error: '링크가 만료되었습니다.' },
        { status: 410 }
      );
    }

    // 사용 여부 확인 (일회용 - 선택사항)
    // NOTE: 일부러 일회용으로 만들지 않는다. 문자 링크는 카카오톡·메신저의 링크 미리보기가 먼저 한 번 열 수 있어서
    //       「한 번 쓰면 끝」으로 하면 손님이 진짜로 눌렀을 때 이미 사용된 링크가 된다. 첫 사용 시각을 담는 열이 없어
    //       「10분 안 재사용」 허용도 만들 수 없으므로 만료(30일)까지 재사용을 허용하고, 대신 이 링크로는
    //       그 손님 번호의 30분짜리 번호 인증 쿠키만 발급한다(주문 열람·취소·수령시간 변경 범위).
    // if (tokenData.used) {
    //   console.error('[VerifyToken] Token already used:', token);
    //   return NextResponse.json(
    //     { success: false, error: '이미 사용된 링크입니다.' },
    //     { status: 410 }
    //   );
    // }

    // 토큰 사용 처리 (일회용으로 만들려면 주석 해제)
    // await supabase
    //   .from('one_time_auth_tokens')
    //   .update({ used: true })
    //   .eq('id', tokenData.id);

    const customerPhone: string = tokenData.customer?.phone ?? '';
    if (!/^01[0-9]{8,9}$/.test(customerPhone)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 링크입니다.' },
        { status: 404 }
      );
    }

    console.log('[VerifyToken] Token verified');

    const res = NextResponse.json(
      {
        success: true,
        phone: customerPhone,
        customerName: tokenData.customer.name,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
    setPhoneSession(res, customerPhone);
    return res;
  } catch (error: any) {
    console.error('[VerifyToken] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
