-- Migration 004: Email verification, password resets, token versioning, and unique lowercase email index

-- 1. Add token_version to users for session revocation
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0 NOT NULL;

-- 2. Create email_verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_email_verif_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_token_hash ON email_verifications(token_hash);

CREATE INDEX IF NOT EXISTS idx_pwd_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_token_hash ON password_resets(token_hash);

-- 5. Case-insensitive unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users(LOWER(email));

-- 6. Ensure existing users (e.g. seeded admin & student) remain verified and active
UPDATE users 
SET email_verified = true, token_version = COALESCE(token_version, 0)
WHERE email_verified IS FALSE AND (role = 'admin' OR email LIKE '%@uni.edu');
