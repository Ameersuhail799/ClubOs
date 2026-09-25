-- ==============================================================================
-- ClubOS — Row Level Security (RLS) Security Hardening Pass
-- Build 02.3.1: Strict Mutation Constraints & Client Hardening
--
-- Hardening Summary:
-- 1. Tasks: Enforce immutability of sensitive task columns (organization_id,
--    primary_group_id, parent_task_id, task_code, created_by).
-- 2. Tasks: Enforce that Group Heads can delegate only within their own primary group.
-- 3. Notifications: Drop direct client INSERT policy. Creation is strictly
--    reserved for trusted server/RPC execution.
-- 4. Activity Records: Drop direct client INSERT policy. Fabricating audit
--    records from the browser is blocked. Audit trail is strictly server/trigger managed.
-- 5. Supporting tables: Lock down relational keys on UPDATE (comments, org_members,
--    task_access, notifications, personal_todos) to prevent key hijacking.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Notifications Hardening: Remove Unrestricted Client INSERT
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "notifications_insert_authorized" ON notifications;

-- Retain strictly:
-- - SELECT: recipient only ("notifications_select_recipient")
-- - UPDATE: recipient only ("notifications_update_recipient") e.g. mark read
-- - DELETE: recipient only ("notifications_delete_recipient")
-- Client INSERT is intentionally eliminated.

-- ------------------------------------------------------------------------------
-- 2. Activity Records Hardening: Remove Client INSERT Fabrication
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "activity_records_insert_authorized" ON activity_records;

-- Retain strictly:
-- - SELECT: authorized resources ("activity_records_select_authorized")
-- - UPDATE: denied (no policy)
-- - DELETE: denied (no policy)
-- - INSERT: denied (no policy) -> Server/RPC trusted context only.

-- ------------------------------------------------------------------------------
-- 3. Task Mutation Validation Trigger & Constraints
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.validate_task_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- created_by must match authenticated caller
    IF NEW.created_by <> auth.uid() THEN
      RAISE EXCEPTION 'created_by must match authenticated user';
    END IF;

    -- Group Head delegation boundary check:
    -- If created by a group_head (and not main_head), assignee must belong to the same primary group
    IF private.is_org_group_head(NEW.organization_id, NEW.primary_group_id) 
       AND NOT private.is_org_main_head(NEW.organization_id) THEN
      IF NEW.assignee_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = NEW.organization_id
            AND om.user_id = NEW.assignee_id
            AND om.primary_group_id = NEW.primary_group_id
            AND om.status = 'active'
        ) THEN
          RAISE EXCEPTION 'Group Head can only assign tasks to active members within their own primary group';
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Enforce immutability of structural and ownership keys
    IF NEW.organization_id <> OLD.organization_id THEN
      RAISE EXCEPTION 'Modifying organization_id is strictly prohibited';
    END IF;

    IF NEW.task_code <> OLD.task_code THEN
      RAISE EXCEPTION 'Modifying task_code is strictly prohibited';
    END IF;

    IF NEW.created_by <> OLD.created_by THEN
      RAISE EXCEPTION 'Modifying created_by is strictly prohibited';
    END IF;

    IF NEW.primary_group_id <> OLD.primary_group_id THEN
      RAISE EXCEPTION 'Modifying primary_group_id via direct update is strictly prohibited';
    END IF;

    IF NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id THEN
      RAISE EXCEPTION 'Modifying parent_task_id via direct update is strictly prohibited';
    END IF;

    -- Guard assignment, delegation, volunteer pool, and deadline modifications
    IF (NEW.assignee_id IS DISTINCT FROM OLD.assignee_id OR
        NEW.assigned_head_id IS DISTINCT FROM OLD.assigned_head_id OR
        NEW.is_volunteer_pool <> OLD.is_volunteer_pool OR
        NEW.deadline IS DISTINCT FROM OLD.deadline) THEN

      -- Must be Main Head or Group Head of this task's primary group
      IF NOT (
        private.is_org_main_head(OLD.organization_id) OR
        private.is_org_group_head(OLD.organization_id, OLD.primary_group_id)
      ) THEN
        RAISE EXCEPTION 'Only authorized Main Head or Group Head may assign, delegate, or adjust task parameters';
      END IF;

      -- Group Head delegation restriction:
      -- Group Heads can delegate ONLY to active members within their own primary group
      IF private.is_org_group_head(OLD.organization_id, OLD.primary_group_id) 
         AND NOT private.is_org_main_head(OLD.organization_id) THEN
        IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
          IF NOT EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = OLD.organization_id
              AND om.user_id = NEW.assignee_id
              AND om.primary_group_id = OLD.primary_group_id
              AND om.status = 'active'
          ) THEN
            RAISE EXCEPTION 'Group Head can delegate only to active members within their own primary group';
          END IF;
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_task_mutation_trigger ON tasks;
CREATE TRIGGER validate_task_mutation_trigger
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_task_mutation();

-- ------------------------------------------------------------------------------
-- 4. Cross-Organization Boundary Guard on task_access
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.validate_task_access_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_task_org_id UUID;
BEGIN
  SELECT organization_id INTO v_task_org_id FROM tasks WHERE id = NEW.task_id;
  IF v_task_org_id IS NULL OR v_task_org_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'task_access organization_id must match the target task organization_id';
  END IF;

  -- If granted to a group, ensure group belongs to the same organization
  IF NEW.group_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = NEW.group_id
        AND g.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Target group must belong to the same organization';
    END IF;
  END IF;

  -- If granted to a user, ensure user is an active member of the same organization
  IF NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = NEW.organization_id
        AND om.user_id = NEW.user_id
        AND om.status = 'active'
    ) THEN
      RAISE EXCEPTION 'Target user must be an active member of the organization';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.granted_by <> auth.uid() THEN
      RAISE EXCEPTION 'granted_by must match authenticated caller';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.task_id <> OLD.task_id OR NEW.organization_id <> OLD.organization_id THEN
      RAISE EXCEPTION 'Modifying task_id or organization_id on task_access is strictly prohibited';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_task_access_mutation_trigger ON task_access;
CREATE TRIGGER validate_task_access_mutation_trigger
  BEFORE INSERT OR UPDATE ON task_access
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_task_access_mutation();

-- ------------------------------------------------------------------------------
-- 5. Relational Key Immutability Triggers
-- ------------------------------------------------------------------------------

-- Comments: Disallow reparenting or author spoofing on update
CREATE OR REPLACE FUNCTION private.validate_comments_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.task_id <> OLD.task_id OR 
       NEW.author_id <> OLD.author_id OR 
       NEW.organization_id <> OLD.organization_id THEN
      RAISE EXCEPTION 'Modifying task_id, author_id, or organization_id on comments is prohibited';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_comments_mutation_trigger ON comments;
CREATE TRIGGER validate_comments_mutation_trigger
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_comments_mutation();

-- Organization Members: Disallow modifying organization_id or user_id
CREATE OR REPLACE FUNCTION private.validate_org_members_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id <> OLD.organization_id OR 
       NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'Modifying organization_id or user_id on organization_members is prohibited';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_org_members_mutation_trigger ON organization_members;
CREATE TRIGGER validate_org_members_mutation_trigger
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_org_members_mutation();

-- Notifications: Disallow modifying recipient_id, organization_id, or type on update
CREATE OR REPLACE FUNCTION private.validate_notifications_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.recipient_id <> OLD.recipient_id OR 
       NEW.organization_id <> OLD.organization_id OR 
       NEW.type <> OLD.type THEN
      RAISE EXCEPTION 'Modifying recipient_id, organization_id, or type on notifications is prohibited';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_notifications_mutation_trigger ON notifications;
CREATE TRIGGER validate_notifications_mutation_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_notifications_mutation();

-- Personal Todos: Disallow reassigning user_id or organization_id on update
CREATE OR REPLACE FUNCTION private.validate_personal_todos_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id <> OLD.user_id OR 
       NEW.organization_id <> OLD.organization_id THEN
      RAISE EXCEPTION 'Modifying user_id or organization_id on personal_todos is prohibited';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_personal_todos_mutation_trigger ON personal_todos;
CREATE TRIGGER validate_personal_todos_mutation_trigger
  BEFORE UPDATE ON personal_todos
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_personal_todos_mutation();

-- ------------------------------------------------------------------------------
-- 6. Permissions on Private Schema Functions
-- ------------------------------------------------------------------------------

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, anon;
