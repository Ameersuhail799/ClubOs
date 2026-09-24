-- ==============================================================================
-- ClubOS — Core Relational Database Schema
-- Build 02.2: Initial Versioned Migration
-- Conforms strictly to locked ClubOS architecture and business rules.
-- Note: RLS policies will be applied in Build 02.3.
-- ==============================================================================

-- 1. Custom PostgreSQL Enum Types
CREATE TYPE user_role AS ENUM (
  'main_head',
  'group_head',
  'member'
);

CREATE TYPE member_status AS ENUM (
  'active',
  'pending_activation',
  'deactivated'
);

CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

CREATE TYPE task_status AS ENUM (
  'draft',
  'assigned',
  'accepted',
  'in_progress',
  'ready_for_review',
  'completed',
  'blocked',
  'cancelled'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE task_permission AS ENUM (
  'view',
  'edit',
  'review'
);

CREATE TYPE notification_type AS ENUM (
  'task_assigned',
  'task_accepted',
  'task_delegated',
  'review_requested',
  'task_approved',
  'task_reassigned',
  'comment_mention',
  'system_alert'
);

CREATE TYPE event_status AS ENUM (
  'draft',
  'published',
  'archived',
  'cancelled'
);

-- 2. Timestamp Trigger Function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Core Organizations Table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Functional Groups Table (5 Locked Divisions for Tinkers Hub V1)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_groups_org_slug UNIQUE (organization_id, slug)
);

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. User Profiles (Extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Organization Members (Binds User -> Org -> Single Primary Group & Role)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  primary_group_id UUID REFERENCES groups(id) ON DELETE RESTRICT,
  status member_status NOT NULL DEFAULT 'pending_activation',
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_org_members_user UNIQUE (organization_id, user_id)
);

CREATE TRIGGER update_org_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Invitations & Account Lifecycle Table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  primary_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  token TEXT UNIQUE NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. Tasks (Hierarchical Directives, Subtasks, and Volunteer Claim Pool)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  task_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  primary_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_head_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status task_status NOT NULL DEFAULT 'assigned',
  priority task_priority NOT NULL DEFAULT 'medium',
  is_volunteer_pool BOOLEAN NOT NULL DEFAULT FALSE,
  deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tasks_org_code UNIQUE (organization_id, task_code)
);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 9. Explicit Task Collaboration & Cross-Group Access Control
CREATE TABLE task_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  permission task_permission NOT NULL DEFAULT 'view',
  granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_task_access_target CHECK (
    (user_id IS NOT NULL AND group_id IS NULL) OR
    (user_id IS NULL AND group_id IS NOT NULL)
  ),
  CONSTRAINT uq_task_access_user UNIQUE (task_id, user_id),
  CONSTRAINT uq_task_access_group UNIQUE (task_id, group_id)
);

-- 10. Task Discussion & Comments Table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. Notifications Stream Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Personal Todos / Member Scratchpad (Strictly Private)
CREATE TABLE personal_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_personal_todos_updated_at
  BEFORE UPDATE ON personal_todos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. Public / Internal Events Archive Table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  abstract TEXT,
  content TEXT,
  banner_url TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  status event_status NOT NULL DEFAULT 'draft',
  agenda JSONB,
  prerequisites JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_events_org_slug UNIQUE (organization_id, slug)
);

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 14. Broadcast Announcements Table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  target_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 15. File Metadata Ledger Table
CREATE TABLE file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Activity & Audit Records ("What Changed" Granular Ledger)
CREATE TABLE activity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 17. High-Performance Operational Indexes
-- ==============================================================================

-- Organizations & Groups
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_groups_org_id ON groups(organization_id);

-- Profiles & Memberships
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_org_role ON organization_members(organization_id, role);
CREATE INDEX idx_org_members_primary_group ON organization_members(primary_group_id);
CREATE INDEX idx_org_members_status ON organization_members(status);

-- Invitations
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email_org ON invitations(email, organization_id);

-- Tasks & Hierarchies
CREATE INDEX idx_tasks_org_group ON tasks(organization_id, primary_group_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_assigned_head ON tasks(assigned_head_id);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_volunteer_pool ON tasks(is_volunteer_pool) WHERE is_volunteer_pool = TRUE;

-- Cross-Group Task Access
CREATE INDEX idx_task_access_lookup ON task_access(task_id, user_id);
CREATE INDEX idx_task_access_group ON task_access(task_id, group_id);

-- Comments & Discussion
CREATE INDEX idx_comments_task_created ON comments(task_id, created_at ASC);

-- Notifications
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);

-- Personal Todos
CREATE INDEX idx_personal_todos_user_completed ON personal_todos(user_id, is_completed);

-- Events & Announcements
CREATE INDEX idx_events_public_status ON events(is_public, status, starts_at);
CREATE INDEX idx_announcements_public ON announcements(is_public, published_at);
CREATE INDEX idx_announcements_group ON announcements(target_group_id);

-- File Metadata
CREATE INDEX idx_file_metadata_task ON file_metadata(task_id);
CREATE INDEX idx_file_metadata_event ON file_metadata(event_id);

-- Activity Audit Trail
CREATE INDEX idx_activity_task_created ON activity_records(task_id, created_at DESC);
CREATE INDEX idx_activity_org_created ON activity_records(organization_id, created_at DESC);
