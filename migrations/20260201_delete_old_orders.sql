-- 2026년 2월 1일 이전 주문 데이터 삭제
-- 실행 날짜: 2026-02-01

-- 1. 삭제할 주문 수 확인 (실행 전 확인용)
SELECT COUNT(*) as orders_to_delete 
FROM orders 
WHERE created_at < '2026-02-01T00:00:00+09:00';

-- 2. 삭제할 주문 상세 (실행 전 확인용)
SELECT 
  id,
  created_at,
  apt_name,
  status,
  total_amount
FROM orders 
WHERE created_at < '2026-02-01T00:00:00+09:00'
ORDER BY created_at DESC;

-- 3. 실제 삭제 (주의: 이 쿼리를 실행하면 데이터가 영구 삭제됩니다)
-- order_items는 on delete cascade로 자동 삭제됩니다
DELETE FROM orders 
WHERE created_at < '2026-02-01T00:00:00+09:00';

-- 4. 삭제 후 남은 주문 수 확인
SELECT COUNT(*) as remaining_orders FROM orders;

-- 5. 사용되지 않는 인증 코드도 정리 (선택사항)
DELETE FROM verification_codes 
WHERE created_at < '2026-02-01T00:00:00+09:00';
