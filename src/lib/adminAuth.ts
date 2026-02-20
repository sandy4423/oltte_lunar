/**
 * 관리자 인증 유틸리티
 * 
 * - 서버: verifyAdminAuth() - API 라우트에서 x-admin-password 헤더 검증
 * - 클라이언트: getAdminPassword() - sessionStorage에서 저장된 비밀번호 조회
 */

import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '4423';

/**
 * 관리자 인증 검증 (서버 API용)
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
  
  return null;
}

/**
 * sessionStorage에서 관리자 비밀번호를 가져옴 (클라이언트 전용)
 */
export function getAdminPassword(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('admin_password') || '';
}
