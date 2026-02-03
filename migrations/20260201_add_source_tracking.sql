-- 유입 경로 추적 컬럼 추가
-- 실행 날짜: 2026-02-01

-- 1. orders 테이블에 source 컬럼 추가
ALTER TABLE orders
ADD COLUMN source text;

COMMENT ON COLUMN orders.source IS '유입 경로 (carrot=당근마켓, banner=현수막, threads=쓰레드, etc=기타)';

-- 2. page_views 테이블에 source 컬럼 추가
ALTER TABLE page_views
ADD COLUMN source text;

COMMENT ON COLUMN page_views.source IS '유입 경로 (carrot=당근마켓, banner=현수막, threads=쓰레드, etc=기타)';

-- 3. 인덱스 추가
CREATE INDEX idx_orders_source ON orders(source);
CREATE INDEX idx_page_views_source ON page_views(source);

-- 변경 사항 확인
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'source';

SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'page_views' AND column_name = 'source';
