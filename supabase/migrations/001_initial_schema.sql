-- Lawyer Calendar v2.0 - Initial PostgreSQL / Supabase Schema
-- Timezone: Asia/Bangkok | Language: th-TH

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function for updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.1 users (linked to Supabase Auth uid)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.2 courts
CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  province TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.3 case_categories
CREATE TABLE IF NOT EXISTS case_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Configurable appointment types (Section 2.5)
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('court', 'office', 'personal')),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thai Public Holidays (PRD Change Request Section 5)
CREATE TABLE IF NOT EXISTS public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  holiday_type TEXT NOT NULL DEFAULT 'national',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_holidays_date ON public_holidays(holiday_date) WHERE is_active = TRUE;

-- 6.4 cases
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id),
  category_id UUID NOT NULL REFERENCES case_categories(id),
  black_case_number TEXT NOT NULL,
  case_year SMALLINT NOT NULL,
  plaintiff_name TEXT NOT NULL,
  defendant_name TEXT NOT NULL,
  responsible_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'closed')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Unique constraint only for non-deleted records so soft-deleted cases can be restored cleanly
CREATE UNIQUE INDEX IF NOT EXISTS uq_cases_active_identity
  ON cases(court_id, category_id, black_case_number, case_year)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cases_court_cat_year ON cases(court_id, category_id, case_year);
CREATE INDEX IF NOT EXISTS idx_cases_black_number ON cases(black_case_number);

DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;
CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6.5 appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('court', 'office', 'personal')),
  appointment_type TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT NOT NULL DEFAULT '',
  court_id UUID REFERENCES courts(id),
  responsible_user_id UUID NOT NULL REFERENCES users(id),
  visibility TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared', 'private')),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  reminder_1_day BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_same_day BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(responsible_user_id, appointment_date);

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Prevent hard deletion of cases that still have linked appointments (Section 6.10)
CREATE OR REPLACE FUNCTION prevent_case_delete_with_appointments()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM appointments WHERE case_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete case with linked appointments';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_case_hard_delete ON cases;
CREATE TRIGGER trg_prevent_case_hard_delete
  BEFORE DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION prevent_case_delete_with_appointments();

-- 6.6 appointment_reminders
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  remind_at TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ
);

-- 6.7 notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- 6.8 audit_logs (Append-only; deletion blocked via RLS)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Active office members can read shared resources
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$;

DROP POLICY IF EXISTS "Active users read users" ON users;
CREATE POLICY "Active users read users" ON users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins or self insert users" ON users;
CREATE POLICY "Admins or self insert users" ON users FOR INSERT TO authenticated WITH CHECK (is_admin() OR id = auth.uid());
DROP POLICY IF EXISTS "Admins or self update users" ON users;
CREATE POLICY "Admins or self update users" ON users FOR UPDATE TO authenticated USING (is_admin() OR id = auth.uid());
DROP POLICY IF EXISTS "Admins delete users" ON users;
CREATE POLICY "Admins delete users" ON users FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Authenticated read courts" ON courts;
CREATE POLICY "Authenticated read courts" ON courts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated write courts" ON courts;
CREATE POLICY "Authenticated write courts" ON courts FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read categories" ON case_categories;
CREATE POLICY "Authenticated read categories" ON case_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated write categories" ON case_categories;
CREATE POLICY "Authenticated write categories" ON case_categories FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read appointment_types" ON appointment_types;
CREATE POLICY "Authenticated read appointment_types" ON appointment_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated write appointment_types" ON appointment_types;
CREATE POLICY "Authenticated write appointment_types" ON appointment_types FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read holidays" ON public_holidays;
CREATE POLICY "Authenticated read holidays" ON public_holidays FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins insert holidays" ON public_holidays;
CREATE POLICY "Admins insert holidays" ON public_holidays FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins update holidays" ON public_holidays;
CREATE POLICY "Admins update holidays" ON public_holidays FOR UPDATE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admins delete holidays" ON public_holidays;
CREATE POLICY "Admins delete holidays" ON public_holidays FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Authenticated CRUD cases" ON cases;
CREATE POLICY "Authenticated CRUD cases" ON cases FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated CRUD appointments" ON appointments;
CREATE POLICY "Authenticated CRUD appointments" ON appointments FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Users own reminders" ON appointment_reminders;
CREATE POLICY "Users own reminders" ON appointment_reminders FOR ALL TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users own notifications" ON notifications;
CREATE POLICY "Users own notifications" ON notifications FOR ALL TO authenticated USING (user_id = auth.uid());

-- Audit logs: insert and select allowed, update/delete forbidden
DROP POLICY IF EXISTS "Authenticated read audit_logs" ON audit_logs;
CREATE POLICY "Authenticated read audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert audit_logs" ON audit_logs;
CREATE POLICY "Authenticated insert audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
