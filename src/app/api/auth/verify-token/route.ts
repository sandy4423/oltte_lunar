/**
 * 일회용 인증 토큰 검증 API
 * GET /api/auth/verify-token?token={token}
 * 
 * 픽업시간 회신 링크에서 사용
 * 토큰이 유효하면 해당 고객의 전화번호를 반환하여 자동 인증 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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

    const supabase = createServerSupabaseClient();

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
      console.error('[VerifyToken] Token not found:', token, tokenError);
      return NextResponse.json(
        { success: false, error: '유효하지 않은 링크입니다.' },
        { status: 404 }
      );
    }

    // 토큰 만료 확인
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      console.error('[VerifyToken] Token expired:', token);
      return NextResponse.json(
        { success: false, error: '링크가 만료되었습니다.' },
        { status: 410 }
      );
    }

    // 사용 여부 확인 (일회용 - 선택사항)
    // NOTE: 현재는 여러 번 사용 가능하도록 주석 처리
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

    console.log(`[VerifyToken] Token verified for customer ${tokenData.customer.phone}`);

    return NextResponse.json(
      {
        success: true,
        phone: tokenData.customer.phone,
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
  } catch (error: any) {
    console.error('[VerifyToken] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
