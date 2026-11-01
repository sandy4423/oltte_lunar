-- 2026-11-02 인증·주문 횟수 제한 (보안 리뷰 H1/M1/M4)
--
-- ⛔ 사장님 확인 뒤에만 적용한다 (이 파일은 준비만 해 둔 것이고 실행하지 않았다).
-- ⛔ 주문을 다시 열기(ORDERING_OPEN=true) 전에 반드시 먼저 적용한다.
--    적용 전에 새 코드가 배포되면 인증번호 보내기/확인·주문 만들기는 안전하게 막힌다(503, fail closed).
-- 추가만 한다: 열 1개·표 1개·함수 2개. 기존 데이터는 건드리지 않는다.
-- 적용: node ~/projects/store-automation/lib/db-query.mjs -f migrations/20261102_auth_rate_limits.sql

-- 1) 인증번호 틀린 횟수 (한 줄에 붙는다 — 예전의 code='__fail__' 표시 줄 방식은 쓰지 않는다)
alter table public.verification_codes add column if not exists attempts int not null default 0;

-- 2) 횟수 제한 기록 표 (RLS 켬, 정책 없음 = service_role 만 접근)
create table if not exists public.api_rate_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_api_rate_events_bucket_created on public.api_rate_events (bucket, created_at);
alter table public.api_rate_events enable row level security;

-- 3) 횟수 제한: 창(window) 안에 p_limit 번 미만이면 1건 기록하고 true, 아니면 false.
--    같은 bucket 의 동시 호출은 advisory lock 으로 줄 세워 한도를 넘지 않게 한다.
create or replace function public.rate_limit_hit(p_bucket text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
as $$
declare
  v_count int;
begin
  perform pg_advisory_xact_lock(hashtext(p_bucket));

  -- 값싼 정리: 이 bucket 의 2일 지난 기록 삭제
  delete from public.api_rate_events
   where bucket = p_bucket and created_at < now() - interval '2 days';

  select count(*) into v_count
    from public.api_rate_events
   where bucket = p_bucket
     and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.api_rate_events (bucket) values (p_bucket);
  return true;
end;
$$;

-- 4) 인증번호 확인: 가장 최근의 미확인·미만료 줄 하나만 잠그고 검사. 5번 틀리면 그 줄은 잠김(만료).
--    반환: 'ok' | 'wrong' | 'locked' | 'expired'
create or replace function public.verify_phone_code(p_phone text, p_code text)
returns text
language plpgsql
as $$
declare
  r record;
begin
  perform pg_advisory_xact_lock(hashtext('verify:' || p_phone));

  select id, code, attempts into r
    from public.verification_codes
   where phone = p_phone
     and verified = false
     and expires_at > now()
   order by created_at desc
   limit 1
   for update;

  if not found then
    return 'expired';
  end if;

  if r.attempts >= 5 then
    return 'locked';
  end if;

  if r.code = p_code then
    update public.verification_codes set verified = true where id = r.id;
    return 'ok';
  end if;

  update public.verification_codes
     set attempts = attempts + 1,
         expires_at = case when attempts + 1 >= 5 then now() else expires_at end
   where id = r.id;
  return 'wrong';
end;
$$;

-- 5) 권한: 서버(service_role)만 부를 수 있다
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
revoke all on function public.verify_phone_code(text, text) from public, anon, authenticated;
grant execute on function public.verify_phone_code(text, text) to service_role;

-- ======================= 되돌리기(롤백) =======================
-- drop function if exists public.verify_phone_code(text, text);
-- drop function if exists public.rate_limit_hit(text, int, int);
-- drop table if exists public.api_rate_events;
-- (롤백 전용 — 열을 지우면 기록이 사라진다. 코드를 되돌리지 않았다면 실행하지 말 것)
-- alter table public.verification_codes drop column if exists attempts;
