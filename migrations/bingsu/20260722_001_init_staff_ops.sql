-- ============================================================
-- 올때빙수 직원 운영 앱 — 초기 스키마
-- 대상 Supabase 프로젝트: OltteBingsu_1 (ref: ynwwrflavhazebrkjsme)
--   ※ 만두 주문 시스템(oltte-main)과 별도 DB. 이 폴더의 마이그레이션은
--     상위 migrations/ (oltte-main용)와 절대 섞어서 실행하지 말 것.
--
-- 설계 원칙 (oltte-main의 부채를 반복하지 않기 위함)
--   1. 인증은 Supabase Auth. 자체 비밀번호 컬럼을 두지 않는다.
--   2. 모든 테이블 RLS ON + 정책 명시. service_role 의존 최소화.
--   3. 매장이 하나여도 store_id를 둔다 (2호점/브랜드 확장 대비).
--   4. 분류값은 enum 대신 text + CHECK. 값 추가 시 마이그레이션이 쉽다.
-- ============================================================

-- ------------------------------------------------------------
-- 공통 유틸
-- ------------------------------------------------------------

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- stores — 매장
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL UNIQUE,          -- 예: 'songdo'
  name       TEXT NOT NULL,                 -- 예: '올때빙수 송도점'
  brand      TEXT NOT NULL DEFAULT 'bingsu',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER stores_set_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 기본 매장 1개 시드
INSERT INTO stores (code, name)
VALUES ('songdo', '올때빙수 송도점')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- profiles — 직원 (auth.users 1:1)
--   비밀번호는 auth.users가 관리한다. 여기엔 절대 두지 않는다.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id   UUID REFERENCES stores(id) ON DELETE SET NULL,
  name       TEXT NOT NULL DEFAULT '',
  phone      TEXT,
  role       TEXT NOT NULL DEFAULT 'staff'
             CHECK (role IN ('staff', 'manager', 'owner')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_store_idx ON profiles (store_id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth.users 생성 시 profiles 행 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ------------------------------------------------------------
-- RLS 헬퍼
--   SECURITY DEFINER라 RLS를 우회한다 → profiles 정책이 profiles를
--   다시 조회하며 생기는 무한 재귀를 피하기 위한 장치.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active;
$$;

-- 관리자(매니저/사장) 여부
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(current_staff_role() IN ('manager', 'owner'), FALSE);
$$;

-- ------------------------------------------------------------
-- inventory_items — 재고 항목 마스터
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category            TEXT NOT NULL DEFAULT '기타',   -- 예: 과일/유제품/부자재
  name                TEXT NOT NULL,
  unit                TEXT NOT NULL DEFAULT '개',      -- 주 단위 (박스)
  detail_unit         TEXT,                            -- 낱개 단위 (개)
  check_interval_days INTEGER NOT NULL DEFAULT 1,      -- 며칠마다 체크
  min_qty             NUMERIC(10,2),                   -- 이 아래면 발주 알림
  main_qty            NUMERIC(10,2) NOT NULL DEFAULT 0,
  detail_qty          NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked_at     TIMESTAMPTZ,
  last_memo           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_items_store_idx
  ON inventory_items (store_id, category, sort_order);

CREATE TRIGGER inventory_items_set_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- inventory_logs — 재고 입력 이력 (append-only)
--   staff_name은 스냅샷. 직원이 퇴사해 profiles가 지워져도 이력은 남는다.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id    UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name  TEXT NOT NULL,
  staff_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL DEFAULT '',
  main_qty   NUMERIC(10,2) NOT NULL DEFAULT 0,
  detail_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
  memo       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_logs_store_created_idx
  ON inventory_logs (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_logs_item_idx
  ON inventory_logs (item_id, created_at DESC);

-- ------------------------------------------------------------
-- work_logs — 근무일지 / 출퇴근
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date     DATE NOT NULL,
  clock_in_at   TIMESTAMPTZ,
  clock_out_at  TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 하루 한 명당 한 행. 재출근은 memo로 처리.
  UNIQUE (staff_id, work_date),
  CONSTRAINT work_logs_clock_order CHECK (
    clock_out_at IS NULL OR clock_in_at IS NULL OR clock_out_at >= clock_in_at
  )
);

CREATE INDEX IF NOT EXISTS work_logs_store_date_idx
  ON work_logs (store_id, work_date DESC);

CREATE TRIGGER work_logs_set_updated_at
  BEFORE UPDATE ON work_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- checklists / checklist_items — 오픈·마감 체크리스트 템플릿
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('open', 'close', 'weekly', 'custom')),
  title      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER checklists_set_updated_at
  BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS checklist_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  description   TEXT,
  requires_photo BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checklist_items_checklist_idx
  ON checklist_items (checklist_id, sort_order);

-- ------------------------------------------------------------
-- checklist_runs / checklist_run_items — 일자별 수행 기록
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  run_date     DATE NOT NULL,
  staff_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  staff_name   TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ,
  memo         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 체크리스트당 하루 한 번
  UNIQUE (checklist_id, run_date)
);

CREATE INDEX IF NOT EXISTS checklist_runs_store_date_idx
  ON checklist_runs (store_id, run_date DESC);

CREATE TRIGGER checklist_runs_set_updated_at
  BEFORE UPDATE ON checklist_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS checklist_run_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES checklist_runs(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE SET NULL,
  label             TEXT NOT NULL,
  is_checked        BOOLEAN NOT NULL DEFAULT FALSE,
  photo_url         TEXT,
  memo              TEXT,
  checked_at        TIMESTAMPTZ,
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS checklist_run_items_run_idx
  ON checklist_run_items (run_id, sort_order);

-- ============================================================
-- RLS
--   기본 규칙: 로그인한 직원은 "자기 매장" 데이터만 읽고 쓴다.
--   삭제는 매니저/사장만. 이력 테이블(inventory_logs)은 삭제 불가.
-- ============================================================

ALTER TABLE stores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_run_items ENABLE ROW LEVEL SECURITY;

-- stores: 자기 매장만 조회, 수정은 매니저 이상
CREATE POLICY stores_select ON stores FOR SELECT TO authenticated
  USING (id = current_store_id());
CREATE POLICY stores_update ON stores FOR UPDATE TO authenticated
  USING (id = current_store_id() AND is_manager());

-- profiles: 본인 + 같은 매장 동료 조회. 본인 정보(이름/전화)만 수정.
-- role/store_id 변경은 매니저만 (아래 별도 정책).
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR store_id = current_store_id());
CREATE POLICY profiles_update_self ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_manage ON profiles FOR ALL TO authenticated
  USING (store_id = current_store_id() AND is_manager())
  WITH CHECK (store_id = current_store_id() AND is_manager());

-- inventory_items: 같은 매장이면 조회/수정 가능(재고 입력이 곧 수정),
-- 항목 추가/삭제는 매니저만
CREATE POLICY inventory_items_select ON inventory_items FOR SELECT TO authenticated
  USING (store_id = current_store_id());
CREATE POLICY inventory_items_update ON inventory_items FOR UPDATE TO authenticated
  USING (store_id = current_store_id())
  WITH CHECK (store_id = current_store_id());
CREATE POLICY inventory_items_insert ON inventory_items FOR INSERT TO authenticated
  WITH CHECK (store_id = current_store_id() AND is_manager());
CREATE POLICY inventory_items_delete ON inventory_items FOR DELETE TO authenticated
  USING (store_id = current_store_id() AND is_manager());

-- inventory_logs: 같은 매장 조회, 본인 이름으로 기록. 수정/삭제 정책 없음 = 불가(append-only)
CREATE POLICY inventory_logs_select ON inventory_logs FOR SELECT TO authenticated
  USING (store_id = current_store_id());
CREATE POLICY inventory_logs_insert ON inventory_logs FOR INSERT TO authenticated
  WITH CHECK (store_id = current_store_id() AND staff_id = auth.uid());

-- work_logs: 본인 것만 쓰기. 조회는 본인 + 매니저는 매장 전체.
CREATE POLICY work_logs_select ON work_logs FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR (store_id = current_store_id() AND is_manager()));
CREATE POLICY work_logs_insert ON work_logs FOR INSERT TO authenticated
  WITH CHECK (store_id = current_store_id() AND staff_id = auth.uid());
CREATE POLICY work_logs_update ON work_logs FOR UPDATE TO authenticated
  USING (staff_id = auth.uid() OR (store_id = current_store_id() AND is_manager()))
  WITH CHECK (store_id = current_store_id());
CREATE POLICY work_logs_delete ON work_logs FOR DELETE TO authenticated
  USING (store_id = current_store_id() AND is_manager());

-- checklists / checklist_items: 조회는 전 직원, 편집은 매니저
CREATE POLICY checklists_select ON checklists FOR SELECT TO authenticated
  USING (store_id = current_store_id());
CREATE POLICY checklists_manage ON checklists FOR ALL TO authenticated
  USING (store_id = current_store_id() AND is_manager())
  WITH CHECK (store_id = current_store_id() AND is_manager());

CREATE POLICY checklist_items_select ON checklist_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_items.checklist_id AND c.store_id = current_store_id()
  ));
CREATE POLICY checklist_items_manage ON checklist_items FOR ALL TO authenticated
  USING (is_manager() AND EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_items.checklist_id AND c.store_id = current_store_id()
  ))
  WITH CHECK (is_manager() AND EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_items.checklist_id AND c.store_id = current_store_id()
  ));

-- checklist_runs / run_items: 같은 매장 직원이면 수행 가능
CREATE POLICY checklist_runs_select ON checklist_runs FOR SELECT TO authenticated
  USING (store_id = current_store_id());
CREATE POLICY checklist_runs_insert ON checklist_runs FOR INSERT TO authenticated
  WITH CHECK (store_id = current_store_id());
CREATE POLICY checklist_runs_update ON checklist_runs FOR UPDATE TO authenticated
  USING (store_id = current_store_id())
  WITH CHECK (store_id = current_store_id());
CREATE POLICY checklist_runs_delete ON checklist_runs FOR DELETE TO authenticated
  USING (store_id = current_store_id() AND is_manager());

CREATE POLICY checklist_run_items_select ON checklist_run_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklist_runs r
    WHERE r.id = checklist_run_items.run_id AND r.store_id = current_store_id()
  ));
CREATE POLICY checklist_run_items_write ON checklist_run_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklist_runs r
    WHERE r.id = checklist_run_items.run_id AND r.store_id = current_store_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklist_runs r
    WHERE r.id = checklist_run_items.run_id AND r.store_id = current_store_id()
  ));

-- ------------------------------------------------------------
-- Storage: 체크리스트 사진 버킷 (비공개)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-uploads', 'staff-uploads', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY staff_uploads_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'staff-uploads');
CREATE POLICY staff_uploads_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'staff-uploads');
