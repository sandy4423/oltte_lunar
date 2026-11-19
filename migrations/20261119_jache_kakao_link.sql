-- 자체앱 카카오 로그인 ↔ 휴대폰 번호 연결 (2026-11-19 맥6) — 추가만. ⚠ 아직 적용하지 않음: 실서비스 DB(oltte-main) 적용 전 사장님 확인
-- 카카오가 번호를 주지 않는 경우, 첫 주문 때 문자 인증한 번호를 카카오 계정(auth.users.id)에 묶어 두고 다음부터 카카오만으로 번호를 채운다.
-- 코드: src/lib/jache/kakao.server.ts (표가 없으면 에러를 삼키고 「연결 없음」 → 문자 인증으로 이어진다)
create table if not exists public.jache_kakao_link (
  auth_user_id uuid primary key,
  phone        text not null check (phone ~ '^010[0-9]{8}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- 정책 없이 RLS 만 켠다 — service_role(서버)만 읽고 쓴다. anon 키로는 아무것도 안 된다.
alter table public.jache_kakao_link enable row level security;
