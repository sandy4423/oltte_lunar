-- 포트원에서 토스페이먼츠로 전환 마이그레이션
-- 실행 날짜: 2026-01-30

-- 1. orders 테이블에 토스페이먼츠 관련 컬럼 추가
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS toss_payment_key TEXT,
  ADD COLUMN IF NOT EXISTS toss_secret TEXT,
  ADD COLUMN IF NOT EXISTS vbank_expires_at TIMESTAMPTZ;

-- 2. 기존 portone_payment_id 컬럼은 일단 유지 (데이터 백업용)
-- ALTER TABLE orders DROP COLUMN portone_payment_id;

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_orders_toss_payment_key ON orders(toss_payment_key);
CREATE INDEX IF NOT EXISTS idx_orders_status_cutoff ON orders(status, cutoff_at) 
  WHERE status = 'WAITING_FOR_DEPOSIT';

-- 마이그레이션 완료 후 Supabase에서 실행하세요:
-- 1. Supabase Dashboard > SQL Editor에서 이 파일 실행
-- 2. 정상 작동 확인 후 portone_payment_id 컬럼 제거 (선택사항)
