-- 양지육수 제품 SKU 추가
-- 실행 날짜: 2026-01-30

-- product_sku enum에 broth_1200ml 추가
ALTER TYPE product_sku ADD VALUE IF NOT EXISTS 'broth_1200ml';

-- 변경 사항 확인
SELECT enum_range(NULL::product_sku);
