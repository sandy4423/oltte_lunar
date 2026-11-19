-- 2026-11-19 포스 「고객용 채널 노출」(내부 kioskEnabled=false) 상품·카테고리를 자체앱에서도 숨기려고, 맥미니가 1분마다 채워 넣는 목록. 추가만.
create table if not exists public.jache_menu_hidden (
  item_id    text primary key,          -- 토스 카탈로그 상품 id (공개 API 와 같음)
  kind       text not null default 'item' check (kind in ('item','category')),
  title      text,
  synced_at  timestamptz not null default now()
);
alter table public.jache_menu_hidden enable row level security;
-- 마지막 동기화 시각(빈 목록일 때도 살아 있는지 알려고)
create table if not exists public.jache_menu_hidden_sync (
  id         int primary key default 1 check (id = 1),
  synced_at  timestamptz not null default now(),
  hidden_count int not null default 0
);
alter table public.jache_menu_hidden_sync enable row level security;
