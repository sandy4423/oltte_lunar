-- 구인 지원서 테이블
CREATE TABLE IF NOT EXISTS hire_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  positions TEXT[] NOT NULL,
  intro TEXT DEFAULT '',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화 (서비스 롤 키로만 insert)
ALTER TABLE hire_applications ENABLE ROW LEVEL SECURITY;

-- anon 유저가 insert만 가능 (자기 지원서 제출)
CREATE POLICY "Anyone can submit application"
  ON hire_applications FOR INSERT
  TO anon
  WITH CHECK (true);

-- storage bucket (이미 있으면 무시)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 누구나 uploads/hire/ 경로에 업로드 가능
CREATE POLICY "Allow hire photo upload"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'hire');
