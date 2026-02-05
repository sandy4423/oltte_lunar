-- 현금영수증 정보 추가
-- 주문 완료 페이지에서 고객이 입력한 현금영수증 정보를 저장하고
-- 입금 완료 시 토스페이먼츠 API로 자동 발급

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cash_receipt_type TEXT CHECK (cash_receipt_type IN ('소득공제', '지출증빙', NULL)),
ADD COLUMN IF NOT EXISTS cash_receipt_number TEXT,
ADD COLUMN IF NOT EXISTS cash_receipt_issued BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cash_receipt_url TEXT,
ADD COLUMN IF NOT EXISTS cash_receipt_key TEXT;

COMMENT ON COLUMN orders.cash_receipt_type IS '현금영수증 종류 (소득공제/지출증빙)';
COMMENT ON COLUMN orders.cash_receipt_number IS '현금영수증 등록번호 (휴대폰번호, 사업자번호 등)';
COMMENT ON COLUMN orders.cash_receipt_issued IS '현금영수증 발급 완료 여부';
COMMENT ON COLUMN orders.cash_receipt_url IS '발급된 현금영수증 URL';
COMMENT ON COLUMN orders.cash_receipt_key IS '토스페이먼츠 현금영수증 고유키';
