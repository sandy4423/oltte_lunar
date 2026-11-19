-- 2026-11-19 자체앱 조리 완료 문자(포스 「호출」) — 한 주문에 한 번만 보내려고 보낸 시각을 남긴다. 추가만.
alter table public.jache_orders add column if not exists ready_sms_at timestamptz;
