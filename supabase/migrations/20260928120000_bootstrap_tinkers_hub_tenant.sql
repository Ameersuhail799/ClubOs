-- ==============================================================================
-- ClubOS — Production Tenant Bootstrap Migration: Tinkers Hub
-- Build 02.19.2: Idempotent initialization of the primary institutional tenant
--
-- Provisions:
-- 1. Tinkers Hub core organization (slug: tinkers-hub, status: active)
-- 2. Five locked functional divisions:
--    - Project Handling
--    - Event
--    - Finance
--    - Outreach
--    - Media & Documentation
-- 3. Profile record for the existing Main Head user (Ameer Suhail)
-- 4. Authoritative Main Head active membership bound to Tinkers Hub
--
-- Safety & Invariants:
-- - 100% idempotent via ON CONFLICT guards and stable slug matching
-- - Does NOT create or alter auth.users credentials
-- - Does NOT modify or delete any existing test organizations or memberships
-- - Preserves all RLS policies and table constraints
-- ==============================================================================

DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID := '1e8ff0f1-b19a-4605-8a61-7886023d062a'::uuid;
  v_user_email TEXT := 'ameersuhail81570@gmail.com';
BEGIN
  -- 1. Ensure Tinkers Hub organization exists
  INSERT INTO public.organizations (name, slug, status)
  VALUES ('Tinkers Hub', 'tinkers-hub', 'active')
  ON CONFLICT (slug) DO UPDATE
    SET status = 'active'
  RETURNING id INTO v_org_id;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'tinkers-hub';
  END IF;

  -- 2. Ensure the 5 locked functional divisions exist for Tinkers Hub
  INSERT INTO public.groups (organization_id, name, slug, description)
  VALUES 
    (v_org_id, 'Project Handling', 'project-handling', 'Core engineering directives, hardware prototyping, and technical delivery'),
    (v_org_id, 'Event', 'event', 'Upcoming event timelines, event logistics tasks, and group operations'),
    (v_org_id, 'Finance', 'finance', 'Budget allocation, expense tracking, and financial governance'),
    (v_org_id, 'Outreach', 'outreach', 'Public relations, partnerships, community communications, and external relations'),
    (v_org_id, 'Media & Documentation', 'media-documentation', 'Authentic photography, media assets, design, and institutional archives')
  ON CONFLICT (organization_id, slug) DO NOTHING;

  -- 3. If the Main Head auth user exists in auth.users, ensure profile & membership
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (v_user_id, 'Ameer Suhail', v_user_email)
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email;

    -- Ensure active Main Head membership exists (primary_group_id is NULL for organization-wide leadership)
    INSERT INTO public.organization_members (organization_id, user_id, role, primary_group_id, status)
    VALUES (v_org_id, v_user_id, 'main_head', NULL, 'active')
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = 'main_head',
          status = 'active';
  END IF;
END $$;
