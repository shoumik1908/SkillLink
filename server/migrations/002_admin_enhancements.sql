-- Migration 002: Admin Enhancements & Moderation
-- 1. Soft-delete support for users
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Expand listings status check constraint
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check 
  CHECK (status IN ('OPEN', 'FILLED', 'CLOSED', 'FLAGGED', 'REMOVED'));

-- 3. Enhance audit_log table to match requirements
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Backfill actor_id from user_id if any existing rows exist
UPDATE audit_log SET actor_id = user_id WHERE actor_id IS NULL AND user_id IS NOT NULL;
UPDATE audit_log SET metadata = details WHERE metadata IS NULL AND details IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- 4. Enhance reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check 
  CHECK (status IN ('open', 'pending', 'reviewed', 'resolved', 'dismissed'));

-- Backfill 'pending' to 'open' if desired
UPDATE reports SET status = 'open' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
