-- Refine public_content select policy so only 'published' content is visible anonymously
DROP POLICY IF EXISTS "public_content_select" ON public_content;
CREATE POLICY "public_content_select"
  ON public_content
  FOR SELECT
  USING (
    (status = 'published')
    OR private.is_org_active_member(organization_id)
  );
