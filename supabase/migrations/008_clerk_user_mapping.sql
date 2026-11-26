-- Lawyer Calendar v2.3 - Map Clerk user IDs to existing public.users UUID records

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
