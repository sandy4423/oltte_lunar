-- 픽업 날짜/시간 필드 추가
-- 실행 날짜: 2026-02-06

-- orders 테이블에 픽업 날짜/시간 필드 추가
ALTER TABLE orders 
ADD COLUMN pickup_date date,
ADD COLUMN pickup_time text;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.pickup_date IS '픽업 날짜 (is_pickup=true인 경우)';
COMMENT ON COLUMN orders.pickup_time IS '픽업 시간 (예: "14:00")';

-- 변경 사항 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('pickup_date', 'pickup_time');
