-- 자체앱 주문 창 주문 표 (2026-11-18 맥6) — 추가만. ⚠ 아직 적용하지 않음: 실서비스 DB(oltte-main) 적용 전 사장님 확인
-- 기존 orders 표는 전골 예약용 필수 칸(apt_code·dong·ho·delivery_date)과 고정 sku 라 토스포스 메뉴판 상품·옵션을 담지 못해 따로 둔다.
-- 코드: src/lib/jache/orderStore.server.ts (시험 모드에선 이 표 대신 로컬 파일을 쓴다)

create table if not exists public.jache_orders (
  id                text primary key,               -- JC + yymmdd + 10자 (토스페이먼츠 orderId·토스포스 orderKey 로도 씀)
  order_date        date not null,                   -- KST 날짜
  daily_no          integer not null,                -- 그날 순번 → 주문번호 「앱-001」
  order_number      text not null,
  status            text not null default 'PENDING'
                    check (status in ('PENDING','PAID','POS_SENDING','POS_OK','POS_FAILED','CANCELLED')),
  is_test           boolean not null default false,
  phone             text not null,
  lines             jsonb not null,                  -- 서버가 메뉴판으로 다시 계산한 줄 (상품·옵션·할인)
  list_price        integer not null,
  discount_amount   integer not null default 0,
  total_amount      integer not null check (total_amount > 0),
  pickup            text not null,                   -- 'now' 또는 'HH:MM'
  pickup_label      text not null,
  requests          text[] not null default '{}',
  toss_payment_key  text,
  paid_at           timestamptz,
  pos_order_id      text,
  pos_attempts      integer not null default 0,
  pos_error         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (order_date, daily_no)
);

create index if not exists jache_orders_phone_idx on public.jache_orders (phone, created_at desc);
create index if not exists jache_orders_status_idx on public.jache_orders (status) where status in ('PAID','POS_SENDING','POS_FAILED');

-- 정책 없이 RLS 만 켠다 → anon 키로는 읽기·쓰기 불가, 서버(service_role)만 사용
alter table public.jache_orders enable row level security;
