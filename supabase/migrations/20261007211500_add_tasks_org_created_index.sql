-- =============================================================================
-- Migration: Add composite indexes for chronological task queries
-- Item 4 of Performance Audit: Eliminate full-table sort scans on tasks
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_org_created
  ON public.tasks (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_org_group_created
  ON public.tasks (organization_id, primary_group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_org_assignee_created
  ON public.tasks (organization_id, assignee_id, created_at DESC);
