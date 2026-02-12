-- 일회용 인증 토큰 테이블 생성
-- 픽업시간 미선택 고객에게 SMS로 전송할 인증 링크용

CREATE TABLE IF NOT EXISTS one_time_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_auth_tokens_token ON one_time_auth_tokens(token) WHERE NOT used;
CREATE INDEX idx_auth_tokens_customer ON one_time_auth_tokens(customer_id);
CREATE INDEX idx_auth_tokens_expires ON one_time_auth_tokens(expires_at);

-- RLS 정책 활성화 (서버 전용 테이블)
ALTER TABLE one_time_auth_tokens ENABLE ROW LEVEL SECURITY;

-- 코멘트 추가
COMMENT ON TABLE one_time_auth_tokens IS '일회용 인증 토큰 (픽업시간 회신 링크용)';
COMMENT ON COLUMN one_time_auth_tokens.customer_id IS '고객 ID';
COMMENT ON COLUMN one_time_auth_tokens.token IS '랜덤 토큰 (64자리 hex)';
COMMENT ON COLUMN one_time_auth_tokens.expires_at IS '만료 일시 (생성 후 30일)';
COMMENT ON COLUMN one_time_auth_tokens.used IS '사용 여부 (일회용)';
