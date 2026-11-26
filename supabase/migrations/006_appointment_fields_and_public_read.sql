-- Lawyer Calendar v2.1 - Appointment courtroom, lawyer role, sequence note & performance indexes

-- 1. Add our_role to cases
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS our_role TEXT NOT NULL DEFAULT 'plaintiff_lawyer'
  CHECK (our_role IN ('plaintiff_lawyer', 'defendant_lawyer', 'other'));

-- 2. Add courtroom, our_role, sequence_note, plaintiff_name, defendant_name to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS courtroom TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS our_role TEXT CHECK (our_role IN ('plaintiff_lawyer', 'defendant_lawyer', 'other')),
  ADD COLUMN IF NOT EXISTS sequence_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS plaintiff_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS defendant_name TEXT NOT NULL DEFAULT '';

-- 3. Composite index for fast daily/weekly active appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_date_active
  ON appointments(appointment_date, start_time)
  WHERE deleted_at IS NULL;
