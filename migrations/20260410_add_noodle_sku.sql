-- 전골 이벤트용 SKU 추가
ALTER TYPE product_sku ADD VALUE IF NOT EXISTS 'hotpot_cool';
ALTER TYPE product_sku ADD VALUE IF NOT EXISTS 'hotpot_spicy';
ALTER TYPE product_sku ADD VALUE IF NOT EXISTS 'broth_add';
ALTER TYPE product_sku ADD VALUE IF NOT EXISTS 'dumpling_add';
ALTER TYPE product_sku ADD VALUE IF NOT EXISTS 'noodle';

-- orders 테이블 realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
