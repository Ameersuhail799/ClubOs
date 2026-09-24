-- ==============================================================================
-- ClubOS — Row Level Security (RLS) & Authorization Foundation
-- Build 02.3: Initial Versioned Security Policies
--
-- Security Model:
-- - organization_members is the source of truth for org membership, role,
--   primary group, and account status (status = 'active').
-- - main_head → full access inside their own organization.
-- - group_head → only their primary group + explicit task_access grants.
-- - member → own work & primary group scope + explicit task_access grants.
-- - No cross-organization access.
-- - No cross-group discovery by guessing IDs, URLs, or API requests.
-- - Deactivated accounts immediately lose protected access while historical data persists.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Private Non-API Schema & Secure Helper Functions
-- ------------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS private;

-- Restrict schema usage
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, anon;

-- Helper 1: Get active organization IDs for the current authenticated user
CREATE OR REPLACE FUNCTION private.get_user_active_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

-- Helper 2: Check if current user is an active member of a specific organization
CREATE OR REPLACE FUNCTION private.is_org_active_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Helper 3: Check if current user is an active main_head of a specific organization
CREATE OR REPLACE FUNCTION private.is_org_main_head(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND role = 'main_head'
      AND status = 'active'
  );
$$;

-- Helper 4: Get current user's primary_group_id in a specific organization
CREATE OR REPLACE FUNCTION private.get_user_primary_group_id(target_org_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT primary_group_id
  FROM organization_members
  WHERE organization_id = target_org_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

-- Helper 5: Check if current user is an active group_head of a specific group
CREATE OR REPLACE FUNCTION private.is_org_group_head(target_org_id UUID, target_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND role = 'group_head'
      AND primary_group_id = target_group_id
      AND status = 'active'
  );
$$;

-- Helper 6: Check if current user can view a given user's profile
CREATE OR REPLACE FUNCTION private.can_view_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (target_user_id = auth.uid()) OR EXISTS (
    SELECT 1
    FROM organization_members om_viewer
    JOIN organization_members om_target
      ON om_viewer.organization_id = om_target.organization_id
    WHERE om_viewer.user_id = auth.uid()
      AND om_viewer.status = 'active'
      AND om_target.user_id = target_user_id
      AND (
        om_viewer.role = 'main_head'
        OR om_viewer.primary_group_id = om_target.primary_group_id
      )
  );
$$;

-- Helper 7: Check if current user can read a given task
-- Enforces:
-- 1. Active membership in task's organization
-- 2. Parent boundary verification (child task cannot bypass parent authorization)
-- 3. main_head organization-wide access
-- 4. group_head / member own primary group scope
-- 5. Explicit cross-group task_access grants
CREATE OR REPLACE FUNCTION private.can_read_task(target_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_task RECORD;
  v_member RECORD;
  v_has_explicit_access BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id, organization_id, primary_group_id, parent_task_id
  INTO v_task
  FROM tasks
  WHERE id = target_task_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Active membership check
  SELECT role, primary_group_id, status
  INTO v_member
  FROM organization_members
  WHERE organization_id = v_task.organization_id
    AND user_id = v_user_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Child task parent boundary check (must have permission on parent as well)
  IF v_task.parent_task_id IS NOT NULL THEN
    IF NOT private.can_read_task(v_task.parent_task_id) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Main Head organization-wide access
  IF v_member.role = 'main_head' THEN
    RETURN TRUE;
  END IF;

  -- Own group access
  IF v_task.primary_group_id = v_member.primary_group_id THEN
    RETURN TRUE;
  END IF;

  -- Explicit task-level collaboration grant (for user directly or user's group)
  SELECT EXISTS (
    SELECT 1
    FROM task_access ta
    WHERE ta.task_id = v_task.id
      AND (ta.user_id = v_user_id OR ta.group_id = v_member.primary_group_id)
  ) INTO v_has_explicit_access;

  RETURN v_has_explicit_access;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Enable Row Level Security Across All 14 Core Tables
-- ------------------------------------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_records ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Table Policies: organizations
-- ------------------------------------------------------------------------------

CREATE POLICY "organizations_select_active_members"
  ON organizations
  FOR SELECT
  USING (id IN (SELECT private.get_user_active_org_ids()));

CREATE POLICY "organizations_update_main_head"
  ON organizations
  FOR UPDATE
  USING (private.is_org_main_head(id))
  WITH CHECK (private.is_org_main_head(id));

-- ------------------------------------------------------------------------------
-- 4. Table Policies: groups
-- ------------------------------------------------------------------------------

CREATE POLICY "groups_select_authorized"
  ON groups
  FOR SELECT
  USING (
    private.is_org_main_head(organization_id)
    OR id = private.get_user_primary_group_id(organization_id)
  );

CREATE POLICY "groups_manage_main_head"
  ON groups
  FOR ALL
  USING (private.is_org_main_head(organization_id))
  WITH CHECK (private.is_org_main_head(organization_id));

-- ------------------------------------------------------------------------------
-- 5. Table Policies: profiles
-- ------------------------------------------------------------------------------

CREATE POLICY "profiles_select_authorized"
  ON profiles
  FOR SELECT
  USING (private.can_view_profile(id));

CREATE POLICY "profiles_insert_self"
  ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_self"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- 6. Table Policies: organization_members
-- ------------------------------------------------------------------------------

CREATE POLICY "org_members_select_authorized"
  ON organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR private.is_org_main_head(organization_id)
    OR (
      primary_group_id IS NOT NULL
      AND primary_group_id = private.get_user_primary_group_id(organization_id)
    )
  );

CREATE POLICY "org_members_insert_main_head"
  ON organization_members
  FOR INSERT
  WITH CHECK (private.is_org_main_head(organization_id));

CREATE POLICY "org_members_update_main_head"
  ON organization_members
  FOR UPDATE
  USING (private.is_org_main_head(organization_id))
  WITH CHECK (private.is_org_main_head(organization_id));

CREATE POLICY "org_members_delete_main_head"
  ON organization_members
  FOR DELETE
  USING (private.is_org_main_head(organization_id));

-- ------------------------------------------------------------------------------
-- 7. Table Policies: invitations
-- ------------------------------------------------------------------------------

CREATE POLICY "invitations_main_head_only"
  ON invitations
  FOR ALL
  USING (private.is_org_main_head(organization_id))
  WITH CHECK (private.is_org_main_head(organization_id));

-- ------------------------------------------------------------------------------
-- 8. Table Policies: tasks
-- ------------------------------------------------------------------------------

CREATE POLICY "tasks_select_authorized"
  ON tasks
  FOR SELECT
  USING (private.can_read_task(id));

CREATE POLICY "tasks_insert_heads"
  ON tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      private.is_org_main_head(organization_id)
      OR private.is_org_group_head(organization_id, primary_group_id)
    )
    AND (parent_task_id IS NULL OR private.can_read_task(parent_task_id))
  );

CREATE POLICY "tasks_update_heads"
  ON tasks
  FOR UPDATE
  USING (
    private.is_org_main_head(organization_id)
    OR private.is_org_group_head(organization_id, primary_group_id)
  )
  WITH CHECK (
    private.is_org_main_head(organization_id)
    OR private.is_org_group_head(organization_id, primary_group_id)
  );

CREATE POLICY "tasks_delete_heads"
  ON tasks
  FOR DELETE
  USING (
    private.is_org_main_head(organization_id)
    OR private.is_org_group_head(organization_id, primary_group_id)
  );

-- ------------------------------------------------------------------------------
-- 9. Table Policies: task_access
-- ------------------------------------------------------------------------------

CREATE POLICY "task_access_select_authorized"
  ON task_access
  FOR SELECT
  USING (private.can_read_task(task_id));

CREATE POLICY "task_access_manage_heads"
  ON task_access
  FOR ALL
  USING (
    private.is_org_main_head(organization_id)
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_access.task_id
        AND private.is_org_group_head(t.organization_id, t.primary_group_id)
    )
  )
  WITH CHECK (
    private.is_org_main_head(organization_id)
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_access.task_id
        AND private.is_org_group_head(t.organization_id, t.primary_group_id)
    )
  );

-- ------------------------------------------------------------------------------
-- 10. Table Policies: comments
-- ------------------------------------------------------------------------------

CREATE POLICY "comments_select_authorized"
  ON comments
  FOR SELECT
  USING (private.can_read_task(task_id));

CREATE POLICY "comments_insert_authorized"
  ON comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND private.can_read_task(task_id)
    AND private.is_org_active_member(organization_id)
  );

CREATE POLICY "comments_update_author"
  ON comments
  FOR UPDATE
  USING (auth.uid() = author_id AND private.can_read_task(task_id))
  WITH CHECK (auth.uid() = author_id AND private.can_read_task(task_id));

CREATE POLICY "comments_delete_authorized"
  ON comments
  FOR DELETE
  USING (
    (auth.uid() = author_id OR private.is_org_main_head(organization_id))
    AND private.can_read_task(task_id)
  );

-- ------------------------------------------------------------------------------
-- 11. Table Policies: personal_todos (Strictly Private)
-- ------------------------------------------------------------------------------

CREATE POLICY "personal_todos_select_owner"
  ON personal_todos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "personal_todos_insert_owner"
  ON personal_todos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND private.is_org_active_member(organization_id)
  );

CREATE POLICY "personal_todos_update_owner"
  ON personal_todos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_todos_delete_owner"
  ON personal_todos
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 12. Table Policies: events
-- ------------------------------------------------------------------------------

CREATE POLICY "events_select_public_or_member"
  ON events
  FOR SELECT
  USING (
    (is_public = TRUE AND status = 'published')
    OR private.is_org_active_member(organization_id)
  );

CREATE POLICY "events_manage_main_head"
  ON events
  FOR ALL
  USING (private.is_org_main_head(organization_id))
  WITH CHECK (private.is_org_main_head(organization_id));

-- ------------------------------------------------------------------------------
-- 13. Table Policies: announcements
-- ------------------------------------------------------------------------------

CREATE POLICY "announcements_select_authorized"
  ON announcements
  FOR SELECT
  USING (
    (is_public = TRUE)
    OR (
      private.is_org_active_member(organization_id)
      AND (
        private.is_org_main_head(organization_id)
        OR target_group_id IS NULL
        OR target_group_id = private.get_user_primary_group_id(organization_id)
      )
    )
  );

CREATE POLICY "announcements_manage_heads"
  ON announcements
  FOR ALL
  USING (
    private.is_org_main_head(organization_id)
    OR (target_group_id IS NOT NULL AND private.is_org_group_head(organization_id, target_group_id))
  )
  WITH CHECK (
    private.is_org_main_head(organization_id)
    OR (target_group_id IS NOT NULL AND private.is_org_group_head(organization_id, target_group_id))
  );

-- ------------------------------------------------------------------------------
-- 14. Table Policies: notifications
-- ------------------------------------------------------------------------------

CREATE POLICY "notifications_select_recipient"
  ON notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "notifications_update_recipient"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "notifications_delete_recipient"
  ON notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);

CREATE POLICY "notifications_insert_authorized"
  ON notifications
  FOR INSERT
  WITH CHECK (private.is_org_active_member(organization_id));

-- ------------------------------------------------------------------------------
-- 15. Table Policies: file_metadata
-- ------------------------------------------------------------------------------

CREATE POLICY "file_metadata_select_authorized"
  ON file_metadata
  FOR SELECT
  USING (
    (is_public = TRUE)
    OR (
      private.is_org_active_member(organization_id)
      AND (
        (task_id IS NOT NULL AND private.can_read_task(task_id))
        OR (event_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = file_metadata.event_id
            AND (e.is_public = TRUE OR private.is_org_active_member(e.organization_id))
        ))
        OR (task_id IS NULL AND event_id IS NULL)
      )
    )
  );

CREATE POLICY "file_metadata_insert_authorized"
  ON file_metadata
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id
    AND private.is_org_active_member(organization_id)
    AND (task_id IS NULL OR private.can_read_task(task_id))
  );

CREATE POLICY "file_metadata_delete_authorized"
  ON file_metadata
  FOR DELETE
  USING (
    (auth.uid() = uploader_id OR private.is_org_main_head(organization_id))
    AND private.is_org_active_member(organization_id)
  );

-- ------------------------------------------------------------------------------
-- 16. Table Policies: activity_records (Append-Only / Immutable Audit Trail)
-- ------------------------------------------------------------------------------

CREATE POLICY "activity_records_select_authorized"
  ON activity_records
  FOR SELECT
  USING (
    private.is_org_active_member(organization_id)
    AND (
      (task_id IS NOT NULL AND private.can_read_task(task_id))
      OR (task_id IS NULL AND (
        private.is_org_main_head(organization_id)
        OR actor_id = auth.uid()
      ))
    )
  );

CREATE POLICY "activity_records_insert_authorized"
  ON activity_records
  FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND private.is_org_active_member(organization_id)
    AND (task_id IS NULL OR private.can_read_task(task_id))
  );

-- Note: Intentionally NO UPDATE and NO DELETE policies on activity_records.
-- Since RLS is enabled, any client attempt to UPDATE or DELETE activity_records
-- is rejected by PostgreSQL, guaranteeing an immutable audit trail.
