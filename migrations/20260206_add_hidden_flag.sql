-- 주문 숨기기 기능 추가
-- 테스트 주문 등을 목록 및 통계에서 제외할 수 있도록 함

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_is_hidden ON orders(is_hidden);

COMMENT ON COLUMN orders.is_hidden IS '테스트 주문 등 숨김 처리 여부';
