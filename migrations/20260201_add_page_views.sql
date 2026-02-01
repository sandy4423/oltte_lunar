-- 페이지 방문 기록 테이블
-- 실행 날짜: 2026-02-01

CREATE TABLE page_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page text NOT NULL,
  apt_code text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_page_views_page ON page_views(page);
CREATE INDEX idx_page_views_date ON page_views(created_at);
CREATE INDEX idx_page_views_apt ON page_views(apt_code);

-- 변경 사항 확인
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'page_views'
ORDER BY ordinal_position;
