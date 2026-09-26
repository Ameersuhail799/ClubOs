-- ==============================================================================
-- ClubOS — Invitation Schema Enhancement
-- Build 02.5: Add invited_user_id and make raw token nullable
--
-- Conforms to:
-- - Supabase Admin inviteUserByEmail lifecycle (auth-managed secure tokens)
-- - Linking invitations directly to auth.users(id)
-- ==============================================================================

-- 1. Add invited_user_id column referencing auth.users
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Make token nullable since Supabase Auth manages email invitation tokens internally
ALTER TABLE invitations
  ALTER COLUMN token DROP NOT NULL;

-- 3. Add operational performance indexes
CREATE INDEX IF NOT EXISTS idx_invitations_invited_user ON invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_org_email_status ON invitations(organization_id, email, status);
