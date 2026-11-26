-- Lawyer Calendar v2.2 - Cases Upgrade (Court level, ordered parties, multi-notes, client phone)

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS court_level TEXT NOT NULL DEFAULT 'first_instance'
    CHECK (court_level IN ('first_instance', 'appeal', 'supreme')),
  ADD COLUMN IF NOT EXISTS plaintiffs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS defendants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS case_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_contact_name TEXT NOT NULL DEFAULT '';

-- Backfill existing single-text plaintiffs/defendants & notes into structured JSONB arrays
UPDATE cases
SET plaintiffs = jsonb_build_array(jsonb_build_object('order', 1, 'name', plaintiff_name))
WHERE (plaintiffs IS NULL OR jsonb_array_length(plaintiffs) = 0)
  AND plaintiff_name IS NOT NULL
  AND trim(plaintiff_name) <> '';

UPDATE cases
SET defendants = jsonb_build_array(jsonb_build_object('order', 1, 'name', defendant_name))
WHERE (defendants IS NULL OR jsonb_array_length(defendants) = 0)
  AND defendant_name IS NOT NULL
  AND trim(defendant_name) <> '';

UPDATE cases
SET case_notes = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'content', notes,
    'created_by', created_by::text,
    'created_by_name', 'บันทึกเดิม',
    'created_at', created_at::text
  )
)
WHERE (case_notes IS NULL OR jsonb_array_length(case_notes) = 0)
  AND notes IS NOT NULL
  AND trim(notes) <> '';
