/**
 * 관리자 인증 유틸리티 (클라이언트 안전)
 *
 * - 클라이언트: getAdminPassword() - sessionStorage에서 저장된 비밀번호 조회
 * - 서버: verifyAdminAuth() 는 '@/lib/adminAuth.server' 로 분리되어 있다.
 *   (node:crypto 의존 때문에 클라이언트 번들에 포함되면 빌드가 깨진다)
 *
 * 이 파일에는 서버 전용 코드나 비밀값을 절대 넣지 마라.
 * 클라이언트 컴포넌트들이 직접 import 한다.
 */

/**
 * sessionStorage에서 관리자 비밀번호를 가져옴 (클라이언트 전용)
 *
 * 관리자 API 호출 시 x-admin-password 헤더 값으로 사용된다.
 */
export function getAdminPassword(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('admin_password') || '';
}
