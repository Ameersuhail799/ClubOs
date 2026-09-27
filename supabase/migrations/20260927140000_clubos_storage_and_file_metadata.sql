-- ============================================================================
-- ClubOS Build 02.13: File Storage & Secure Attachments Migration
-- 1. Add bucket_id to file_metadata
-- 2. Provision private storage bucket: clubos-files
-- 3. Enhance file_metadata RLS delete policy for Group Heads
-- ============================================================================

-- 1. Add bucket_id column to file_metadata
ALTER TABLE file_metadata
  ADD COLUMN IF NOT EXISTS bucket_id TEXT NOT NULL DEFAULT 'clubos-files';

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_file_metadata_path ON file_metadata(file_path);
CREATE INDEX IF NOT EXISTS idx_file_metadata_org_task ON file_metadata(organization_id, task_id);

-- 3. Provision private storage bucket: clubos-files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clubos-files',
  'clubos-files',
  false,
  26214400, -- 25MB
  null
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400;

-- 4. Update file_metadata delete policy to include Group Head scope
DROP POLICY IF EXISTS "file_metadata_delete_authorized" ON file_metadata;

CREATE POLICY "file_metadata_delete_authorized"
  ON file_metadata
  FOR DELETE
  USING (
    private.is_org_active_member(organization_id)
    AND (
      auth.uid() = uploader_id
      OR private.is_org_main_head(organization_id)
      OR (
        task_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = file_metadata.task_id
            AND (t.assigned_head_id = auth.uid() OR private.is_org_group_head(file_metadata.organization_id, t.primary_group_id))
        )
      )
    )
  );
