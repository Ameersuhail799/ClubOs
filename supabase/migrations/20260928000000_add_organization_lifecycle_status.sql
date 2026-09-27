-- ==============================================================================
-- ClubOS — Organization Lifecycle Status Migration
-- Build 02.19.1: Add lifecycle status column to public.organizations
--
-- Adds organization lifecycle status with default 'active' to support
-- authoritative institutional context resolution and access boundaries.
--
-- Requirements:
-- 1. Status defaults to 'active' for all existing and new organizations.
-- 2. Preserves all existing organization rows, UUIDs, and foreign keys.
-- 3. Constrained to valid lifecycle states: 'active', 'suspended', 'deactivated'.
-- 4. Indexed on status for efficient lifecycle state lookups and queries.
-- ==============================================================================

-- 1. Add status column to organizations with NOT NULL DEFAULT 'active'
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- 2. Add check constraint for valid lifecycle values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_organizations_status'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT chk_organizations_status
      CHECK (status IN ('active', 'suspended', 'deactivated'));
  END IF;
END $$;

-- 3. Index on status for lifecycle state filtering
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
