-- 환불/취소 시스템 추가
-- 2026-02-06

-- 1. 주문 상태에 환불 관련 상태 추가
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CANCEL_REQUESTED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REFUND_PROCESSING';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REFUNDED';

-- 2. 환불 토큰 테이블 생성
CREATE TABLE IF NOT EXISTS refund_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) NOT NULL,
  token text NOT NULL UNIQUE,
  refund_amount int NOT NULL,
  refund_reason text NOT NULL,
  bank_code text,
  account_number text,
  account_holder text,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. orders 테이블에 환불 관련 필드 추가
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS refund_amount int,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refund_bank_code text,
  ADD COLUMN IF NOT EXISTS refund_account_number text,
  ADD COLUMN IF NOT EXISTS refund_account_holder text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_refund_tokens_token ON refund_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refund_tokens_order_id ON refund_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_tokens_expires ON refund_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
