-- 2026-11-02 R5: 실시간(Realtime) 발행에서 orders 표 빼기
--
-- ⛔ 사장님 확인 뒤에만 적용한다 (이 파일은 준비만 해 둔 것이고 실행하지 않았다).
-- 이유: 관리 화면 새 주문 알림(useNewOrderAlert)이 실시간 구독을 버리고 /api/admin/orders 12초 주기 조회로
--       바뀌었다. 더 이상 아무 화면도 orders 변경을 구독하지 않으니, 공개 키로 orders 변경 내용을
--       실시간으로 받아 보는 길을 닫는다.
-- 적용 전 확인: 장부앱(oltte-bookkeeping)이 orders 를 실시간 구독하지 않는지 (구독하면 그쪽이 멈춘다).
--   select * from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders';
-- 적용: node ~/projects/store-automation/lib/db-query.mjs -f migrations/20261102_realtime_drop_orders.sql

alter publication supabase_realtime drop table public.orders;

-- 되돌리기(롤백):
-- alter publication supabase_realtime add table public.orders;
