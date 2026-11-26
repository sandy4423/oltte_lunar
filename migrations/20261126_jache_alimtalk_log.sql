-- 2026-11-26 자체앱 알림톡 발송 기록 — 같은 주문·같은 템플릿은 한 번만 보내려는 장치. 추가만(새 표). ⚠ 아직 적용하지 않음(사장님 확인 뒤)
-- 코드: src/lib/alimtalk.ts. 표가 없으면 발송을 건너뛴다(안 보내는 쪽으로 실패).
create table if not exists public.jache_alimtalk_log (
  order_id     text not null,
  template_key text not null check (template_key in ('received','ready','unclaimed','picked_up','cancelled')),
  status       text not null default 'sending' check (status in ('sending','sent','failed','skipped')),
  message_id   text,
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (order_id, template_key)
);
create index if not exists jache_alimtalk_log_key_idx on public.jache_alimtalk_log (template_key, created_at);

-- 정책 없이 RLS 만 켠다 → anon 키로는 읽기·쓰기 불가, 서버(service_role)만 사용
alter table public.jache_alimtalk_log enable row level security;
