-- ============================================================================
-- ClubOS Build 02.17: Public Club Content Management Migration
-- 1. Create public_content table for Home Hero, About, Programs, and Gallery
-- 2. Update events RLS policy to support public archive viewing
-- 3. Provision clubos-public-assets bucket for public media
-- ============================================================================

-- 1. Create public_content table
CREATE TABLE IF NOT EXISTS public_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'hero', 'about', 'program', 'gallery'
  title TEXT NOT NULL,
  slug TEXT,
  summary TEXT,
  body TEXT,
  media_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'archived'
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & query isolation
CREATE INDEX IF NOT EXISTS idx_public_content_org_type ON public_content(organization_id, content_type);
CREATE INDEX IF NOT EXISTS idx_public_content_status ON public_content(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_public_content_slug ON public_content(organization_id, content_type, slug);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_public_content_updated_at
  BEFORE UPDATE ON public_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE public_content ENABLE ROW LEVEL SECURITY;

-- Select Policy: public users see published or archived; active members see all (including drafts)
DROP POLICY IF EXISTS "public_content_select" ON public_content;
CREATE POLICY "public_content_select"
  ON public_content
  FOR SELECT
  USING (
    (status = 'published')
    OR private.is_org_active_member(organization_id)
  );

-- Management Policy: strictly Main Head of the organization
DROP POLICY IF EXISTS "public_content_manage_main_head" ON public_content;
CREATE POLICY "public_content_manage_main_head"
  ON public_content
  FOR ALL
  USING (private.is_org_main_head(organization_id))
  WITH CHECK (private.is_org_main_head(organization_id));

-- Grant table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public_content TO authenticated;
GRANT SELECT ON public_content TO anon;

-- 2. Update events RLS policy to support public archive viewing
DROP POLICY IF EXISTS "events_select_public_or_member" ON events;
CREATE POLICY "events_select_public_or_member"
  ON events
  FOR SELECT
  USING (
    (is_public = TRUE AND status IN ('published', 'archived'))
    OR private.is_org_active_member(organization_id)
  );

-- 3. Provision public storage bucket: clubos-public-assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clubos-public-assets',
  'clubos-public-assets',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- Storage policies for clubos-public-assets
DROP POLICY IF EXISTS "public_assets_select_all" ON storage.objects;
CREATE POLICY "public_assets_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clubos-public-assets');

DROP POLICY IF EXISTS "public_assets_insert_authenticated" ON storage.objects;
CREATE POLICY "public_assets_insert_authenticated"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'clubos-public-assets'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "public_assets_delete_authenticated" ON storage.objects;
CREATE POLICY "public_assets_delete_authenticated"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'clubos-public-assets'
    AND auth.role() = 'authenticated'
  );
