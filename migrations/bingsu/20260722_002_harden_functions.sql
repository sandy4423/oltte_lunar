-- ============================================================
-- 올때빙수 직원 운영 앱 — 함수 보안 강화
-- 대상: OltteBingsu_1 (ref: ynwwrflavhazebrkjsme)
--
-- Supabase 데이터베이스 어드바이저(security) 경고 대응:
--   - function_search_path_mutable
--   - anon_security_definer_function_executable
-- ============================================================

-- search_path 미고정 함수 → 고정 (검색 경로 하이재킹 방지)
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- 트리거 전용 함수. PostgREST의 /rest/v1/rpc 로 노출될 이유가 없다.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- RLS 헬퍼 함수.
-- 정책 평가는 호출자 롤(authenticated)로 일어나므로 authenticated EXECUTE는
-- 반드시 유지해야 한다. 회수하면 모든 정책이 깨진다.
-- 비로그인(anon) 노출만 차단.
REVOKE EXECUTE ON FUNCTION public.current_store_id()   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_staff_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_manager()         FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_store_id()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager()         TO authenticated;

-- 참고: public.rls_auto_enable() 은 Supabase가 프로젝트에 기본 설치한
-- 이벤트 트리거 함수다 (public 스키마에 테이블 생성 시 RLS 자동 활성화).
-- 어드바이저가 함께 경고하지만 event_trigger 반환형이라 RPC로 호출할 수 없고,
-- 오히려 안전장치 역할을 하므로 건드리지 않는다.
