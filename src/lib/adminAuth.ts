/**
 * 관리자 API 인증 유틸리티
 * 
 * 관리자 API 라우트에서 비밀번호 인증을 수행합니다.
 * 클라이언트는 x-admin-password 헤더로 비밀번호를 전달합니다.
 */

import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = '4423';

/**
 * 관리자 인증 검증
 * 
 * @param request - NextRequest 객체
 * @returns null이면 인증 성공, NextResponse면 인증 실패 응답
 */
export function verifyAdminAuth(request: NextRequest): NextResponse | null {
  const password = request.headers.get('x-admin-password');
  
  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: '관리자 인증이 필요합니다.' },
      { status: 401 }
    );
  }
  
  return null; // 인증 성공
}
