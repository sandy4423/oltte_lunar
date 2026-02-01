-- 픽업 옵션 추가
-- 실행 날짜: 2026-02-01

-- orders 테이블에 픽업 관련 필드 추가
ALTER TABLE orders 
ADD COLUMN is_pickup boolean DEFAULT false,
ADD COLUMN pickup_discount int DEFAULT 0;

-- 인덱스 추가 (픽업 주문 조회용)
CREATE INDEX idx_orders_pickup ON orders(is_pickup);

-- 변경 사항 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('is_pickup', 'pickup_discount');
