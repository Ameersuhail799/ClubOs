import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationContext, type UserRole, type MemberStatus } from "@/lib/auth/context";
import type { Database } from "@/types/database.types";

export interface DirectoryMember {
  id: string; // organization_members.id
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  primaryGroupId: string | null;
  primaryGroupName: string | null;
  primaryGroupSlug: string | null;
  status: MemberStatus;
  joinedAt: string;
  deactivatedAt: string | null;
  invitationId?: string | null;
  invitationStatus?: Database["public"]["Enums"]["invitation_status"] | null;
  invitationExpiresAt?: string | null;
  invitedAt?: string | null;
}

export interface OrganizationGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface MemberActionResult {
  success?: boolean;
  error?: string | null;
  message?: string | null;
}

/**
 * Retrieves the full organizational member directory for the Main Head.
 * Strictly verifies caller is an active Main Head in the specified organization.
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<DirectoryMember[]> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    throw new Error("Authentication required.");
  }

  if (context.role !== "main_head") {
    throw new Error("Access Denied: Only Main Heads may view the member directory.");
  }

  if (context.organization?.id !== organizationId) {
    throw new Error("Security Violation: Cannot access foreign organization directory.");
  }

  const adminClient = createAdminClient();

  // 1. Fetch organization members with primary group details
  const { data: members, error: membersError } = await adminClient
    .from("organization_members")
    .select("*, primary_group:groups(id, name, slug)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (membersError || !members) {
    throw new Error(`Failed to load member ledger: ${membersError?.message}`);
  }

  if (members.length === 0) {
    return [];
  }

  // 2. Fetch profiles for all members in the organization
  const userIds = members.map((m) => m.user_id);
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(`Failed to load member profiles: ${profilesError.message}`);
  }

  const profileMap = new Map<string, (typeof profiles)[0]>();
  for (const prof of profiles || []) {
    profileMap.set(prof.id, prof);
  }

  // 3. Fetch invitations to associate lifecycle context (invitation ID, expires_at)
  const { data: invitations } = await adminClient
    .from("invitations")
    .select("id, email, role, primary_group_id, invited_user_id, status, expires_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  // Map invitations by user_id and email
  type InvitationRow = NonNullable<typeof invitations>[number];
  const inviteByUserId = new Map<string, InvitationRow>();
  const inviteByEmail = new Map<string, InvitationRow>();
  for (const inv of invitations || []) {
    if (inv.invited_user_id && !inviteByUserId.has(inv.invited_user_id)) {
      inviteByUserId.set(inv.invited_user_id, inv);
    }
    const lowerEmail = inv.email.toLowerCase();
    if (!inviteByEmail.has(lowerEmail)) {
      inviteByEmail.set(lowerEmail, inv);
    }
  }

  // 4. Transform into DirectoryMember array
  return members.map((member) => {
    const profile = profileMap.get(member.user_id);
    const primaryGroup = member.primary_group as { id: string; name: string; slug: string } | null;

    const email = profile?.email || "unknown@domain";
    const invite =
      inviteByUserId.get(member.user_id) || inviteByEmail.get(email.toLowerCase());

    return {
      id: member.id,
      userId: member.user_id,
      fullName: profile?.full_name || "Institutional Member",
      email,
      phone: profile?.phone || null,
      avatarUrl: profile?.avatar_url || null,
      role: member.role,
      primaryGroupId: member.primary_group_id,
      primaryGroupName: primaryGroup?.name || null,
      primaryGroupSlug: primaryGroup?.slug || null,
      status: member.status,
      joinedAt: member.created_at,
      deactivatedAt: member.deactivated_at,
      invitationId: invite?.id || null,
      invitationStatus: invite?.status || null,
      invitationExpiresAt: invite?.expires_at || null,
      invitedAt: invite?.created_at || null,
    };
  });
}

/**
 * Retrieves all functional groups belonging to the Main Head's organization.
 */
export async function getOrganizationGroups(
  organizationId: string
): Promise<OrganizationGroup[]> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    throw new Error("Authentication required.");
  }

  if (context.role !== "main_head") {
    throw new Error("Access Denied: Only Main Heads may query organization groups.");
  }

  if (context.organization?.id !== organizationId) {
    throw new Error("Security Violation: Cannot access foreign organization groups.");
  }

  const adminClient = createAdminClient();

  const { data: groups, error } = await adminClient
    .from("groups")
    .select("id, name, slug, description")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !groups) {
    throw new Error(`Failed to load groups: ${error?.message}`);
  }

  return groups;
}

/**
 * Revokes an existing pending invitation.
 * Server verifies: caller is active Main Head in matching org, invitation is pending.
 * Ensures the revoked invitation cannot activate the account later.
 * Preserves historical records and logs audit trail.
 */
export async function revokeInstitutionalInvitation(
  invitationId: string
): Promise<MemberActionResult> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required." };
  }

  if (context.role !== "main_head") {
    return { error: "Access Denied: Only active Main Heads may revoke invitations." };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization." };
  }

  const adminClient = createAdminClient();

  // Find target invitation
  const { data: invitation, error: findError } = await adminClient
    .from("invitations")
    .select("*")
    .eq("id", invitationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (findError || !invitation) {
    return { error: "Invitation not found in your organization." };
  }

  if (invitation.status === "accepted") {
    return { error: "Cannot revoke an invitation that has already been accepted." };
  }

  if (invitation.status === "revoked") {
    return { error: "This invitation is already revoked." };
  }

  if (invitation.status !== "pending") {
    return { error: `Cannot revoke an invitation with status '${invitation.status}'.` };
  }

  const now = new Date().toISOString();

  // 1. Mark invitation as revoked
  const { error: revokeError } = await adminClient
    .from("invitations")
    .update({
      status: "revoked",
      updated_at: now,
    })
    .eq("id", invitationId);

  if (revokeError) {
    return { error: `Failed to revoke invitation: ${revokeError.message}` };
  }

  // 2. Transition pending membership to deactivated so it cannot be activated later
  if (invitation.invited_user_id) {
    await adminClient
      .from("organization_members")
      .update({
        status: "deactivated",
        deactivated_at: now,
        updated_at: now,
      })
      .eq("organization_id", organizationId)
      .eq("user_id", invitation.invited_user_id)
      .eq("status", "pending_activation");
  }

  // 3. Log immutable administrative audit record
  await adminClient.from("activity_records").insert({
    organization_id: organizationId,
    actor_id: context.user.id,
    task_id: null,
    entity_type: "invitation",
    entity_id: invitationId,
    action: "invitation_revoked",
    previous_state: { status: "pending" },
    new_state: { status: "revoked" },
    metadata: {
      email: invitation.email,
      role: invitation.role,
      primary_group_id: invitation.primary_group_id,
    },
  });

  return {
    success: true,
    message: `Invitation for ${invitation.email} has been revoked.`,
  };
}

/**
 * Triggers a secure password recovery / reset flow for an active member.
 * Does not reveal or set passwords on behalf of the user.
 * Preserves role, organization, and primary group.
 */
export async function resetMemberAccess(
  memberId: string
): Promise<MemberActionResult> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required." };
  }

  if (context.role !== "main_head") {
    return { error: "Access Denied: Only active Main Heads may reset member access." };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization." };
  }

  const adminClient = createAdminClient();

  // Find target membership
  const { data: member, error: memberError } = await adminClient
    .from("organization_members")
    .select("*")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (memberError || !member) {
    return { error: "Member not found in your organization." };
  }

  // Find member profile
  const { data: profile } = await adminClient
    .from("profiles")
    .select("email")
    .eq("id", member.user_id)
    .maybeSingle();

  const email = profile?.email;

  if (!email) {
    return { error: "Member email could not be resolved." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=/reset-password`;

  // Trigger Supabase Auth password recovery dispatch
  const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (resetError) {
    return { error: `Failed to initiate password reset: ${resetError.message}` };
  }

  // Log immutable administrative audit record
  await adminClient.from("activity_records").insert({
    organization_id: organizationId,
    actor_id: context.user.id,
    task_id: null,
    entity_type: "member",
    entity_id: memberId,
    action: "access_reset_requested",
    previous_state: null,
    new_state: null,
    metadata: {
      email,
      role: member.role,
      primary_group_id: member.primary_group_id,
      requested_by: context.user.id,
    },
  });

  return {
    success: true,
    message: `Password reset instructions dispatched to ${email}.`,
  };
}

/**
 * Deactivates an active member within the Main Head's organization.
 * Revokes workspace access, preserves all historical tasks, comments, files, and audit records.
 * Prevents Main Head from deactivating themselves.
 */
export async function deactivateMember(
  memberId: string
): Promise<MemberActionResult> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required." };
  }

  if (context.role !== "main_head") {
    return { error: "Access Denied: Only active Main Heads may deactivate members." };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization." };
  }

  const adminClient = createAdminClient();

  // Find target membership
  const { data: member, error: memberError } = await adminClient
    .from("organization_members")
    .select("*")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (memberError || !member) {
    return { error: "Member not found in your organization." };
  }

  // Prevent self-deactivation of current Main Head session
  if (member.user_id === context.user.id) {
    return { error: "Operation Blocked: You cannot deactivate your own Main Head account." };
  }

  if (member.status === "deactivated") {
    return { error: "This member account is already deactivated." };
  }

  const now = new Date().toISOString();

  // Update membership status to deactivated
  const { error: updateError } = await adminClient
    .from("organization_members")
    .update({
      status: "deactivated",
      deactivated_at: now,
      updated_at: now,
    })
    .eq("id", memberId);

  if (updateError) {
    return { error: `Failed to deactivate member: ${updateError.message}` };
  }

  // Log immutable administrative audit record
  await adminClient.from("activity_records").insert({
    organization_id: organizationId,
    actor_id: context.user.id,
    task_id: null,
    entity_type: "member",
    entity_id: memberId,
    action: "member_deactivated",
    previous_state: { status: member.status },
    new_state: { status: "deactivated", deactivated_at: now },
    metadata: {
      role: member.role,
      primary_group_id: member.primary_group_id,
      target_user_id: member.user_id,
    },
  });

  return {
    success: true,
    message: "Member account has been deactivated. Workspace access is revoked.",
  };
}

/**
 * Reactivates a deactivated member within the Main Head's organization.
 * Restores membership status to active while preserving existing role and primary group.
 */
export async function reactivateMember(
  memberId: string
): Promise<MemberActionResult> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required." };
  }

  if (context.role !== "main_head") {
    return { error: "Access Denied: Only active Main Heads may reactivate members." };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization." };
  }

  const adminClient = createAdminClient();

  // Find target membership
  const { data: member, error: memberError } = await adminClient
    .from("organization_members")
    .select("*")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (memberError || !member) {
    return { error: "Member not found in your organization." };
  }

  if (member.status === "active") {
    return { error: "This member account is already active." };
  }

  const now = new Date().toISOString();

  // Restore membership status to active
  const { error: updateError } = await adminClient
    .from("organization_members")
    .update({
      status: "active",
      deactivated_at: null,
      updated_at: now,
    })
    .eq("id", memberId);

  if (updateError) {
    return { error: `Failed to reactivate member: ${updateError.message}` };
  }

  // Log immutable administrative audit record
  await adminClient.from("activity_records").insert({
    organization_id: organizationId,
    actor_id: context.user.id,
    task_id: null,
    entity_type: "member",
    entity_id: memberId,
    action: "member_reactivated",
    previous_state: { status: member.status },
    new_state: { status: "active" },
    metadata: {
      role: member.role,
      primary_group_id: member.primary_group_id,
      target_user_id: member.user_id,
    },
  });

  return {
    success: true,
    message: "Member account has been reactivated. Workspace access is restored.",
  };
}
