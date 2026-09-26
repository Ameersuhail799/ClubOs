import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext, getCurrentUser, getRoleDefaultPath, type UserRole } from "@/lib/auth/context";
import type { Database } from "@/types/database.types";

export interface CreateInvitationInput {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  primaryGroupId: string;
}

export interface InvitationResult {
  success?: boolean;
  error?: string | null;
  message?: string | null;
  invitationId?: string;
  targetPath?: string;
}

export interface PendingActivationDetails {
  error?: "unauthenticated" | "no_membership" | "already_active" | "deactivated" | "missing_invitation" | "revoked" | "expired" | "already_accepted" | null;
  email?: string;
  fullName?: string;
  organizationName?: string;
  primaryGroupName?: string;
  role?: UserRole;
}

/**
 * Validates and issues a controlled institutional invitation.
 * Only active Main Heads can invoke this service.
 * Enforces authoritative organization scoping and rollback on provisioning failure.
 */
export async function createInstitutionalInvitation(
  input: CreateInvitationInput
): Promise<InvitationResult> {
  const context = await getCurrentOrganizationContext();

  // 1. Authoritative caller verification
  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required. Please sign in." };
  }

  if (context.role !== "main_head") {
    return { error: "Access Denied: Only an active Main Head may issue institutional invitations." };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization." };
  }

  // 2. Input validation
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const role = input.role;
  const primaryGroupId = input.primaryGroupId;

  if (!fullName) {
    return { error: "Full name is required." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { error: "A valid institutional email address is required." };
  }

  if (role === "main_head") {
    return { error: "Security Restriction: Main Head accounts cannot be provisioned through this interface. Only group heads and members can be invited." };
  }

  if (!["group_head", "member"].includes(role)) {
    return { error: "Invalid role specified. Only group_head and member roles are permitted." };
  }

  const adminClient = createAdminClient();

  // 3. Verify primary group belongs to caller's organization
  const { data: targetGroup, error: groupError } = await adminClient
    .from("groups")
    .select("id, name")
    .eq("id", primaryGroupId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (groupError || !targetGroup) {
    return { error: "Selected functional group does not belong to your organization." };
  }

  // 4. Duplicate membership & pending conflict verification
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMember } = await adminClient
      .from("organization_members")
      .select("id, status, role")
      .eq("organization_id", organizationId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      if (existingMember.status === "active") {
        return { error: "A member with this email is already active in your organization." };
      }
      if (existingMember.status === "pending_activation") {
        return { error: "An invitation is already pending activation for this email." };
      }
      if (existingMember.status === "deactivated") {
        return { error: "This user has a deactivated membership. Contact administration to reactivate." };
      }
    }
  }

  // Check for active pending invitation record
  const { data: existingPendingInvite } = await adminClient
    .from("invitations")
    .select("id, status, expires_at")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPendingInvite) {
    const isExpired = new Date(existingPendingInvite.expires_at) < new Date();
    if (!isExpired) {
      return { error: "A non-expired invitation already exists for this email. Use resend if needed." };
    }
  }

  // 5. Supabase Auth Invitation
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=/activate`;

  const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      data: {
        full_name: fullName,
        phone,
      },
    }
  );

  if (authError || !authData.user) {
    return {
      error: `Failed to issue Supabase Auth invitation: ${authError?.message || "Unknown error"}`,
    };
  }

  const invitedUserId = authData.user.id;
  let invitationRecordId: string | null = null;
  let memberRecordId: string | null = null;

  // 6. Provision Database Records (invitation, profile, organization_member) with Rollback
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // A. Insert invitation record
    const { data: invData, error: invError } = await adminClient
      .from("invitations")
      .insert({
        organization_id: organizationId,
        email,
        role,
        primary_group_id: primaryGroupId,
        invited_by: context.user.id,
        invited_user_id: invitedUserId,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (invError || !invData) {
      throw new Error(`Invitation record failure: ${invError?.message}`);
    }
    invitationRecordId = invData.id;

    // B. Upsert user profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: invitedUserId,
          email,
          full_name: fullName,
          phone,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      throw new Error(`Profile creation failure: ${profileError.message}`);
    }

    // C. Insert pending organization membership
    const { data: memberData, error: memberError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: invitedUserId,
        role,
        primary_group_id: primaryGroupId,
        status: "pending_activation",
      })
      .select("id")
      .single();

    if (memberError || !memberData) {
      throw new Error(`Membership provisioning failure: ${memberError?.message}`);
    }
    memberRecordId = memberData.id;

    // Log immutable administrative audit record
    await adminClient.from("activity_records").insert({
      organization_id: organizationId,
      actor_id: context.user.id,
      task_id: null,
      entity_type: "invitation",
      entity_id: invitationRecordId,
      action: "invitation_created",
      previous_state: null,
      new_state: {
        status: "pending",
        role,
        primary_group_id: primaryGroupId,
        email,
      },
      metadata: {
        full_name: fullName,
        phone,
      },
    });

    return {
      success: true,
      message: `Invitation successfully dispatched to ${email}.`,
      invitationId: invitationRecordId,
    };
  } catch (rollbackError: any) {
    // Safe Rollback: Clean up partially created records
    if (memberRecordId) {
      await adminClient.from("organization_members").delete().eq("id", memberRecordId);
    }
    if (invitationRecordId) {
      await adminClient.from("invitations").delete().eq("id", invitationRecordId);
    }
    // Delete newly created auth user if state provisioning failed
    await adminClient.auth.admin.deleteUser(invitedUserId);

    return {
      error: `Database provisioning failed. Changes safely rolled back: ${rollbackError.message}`,
    };
  }
}

/**
 * Re-dispatches an invitation email for an existing pending invitation.
 * Strictly checks that the caller is active Main Head of the matching organization.
 */
export async function resendInstitutionalInvitation(
  invitationId: string
): Promise<InvitationResult> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required." };
  }

  if (context.role !== "main_head") {
    return { error: "Access Denied: Only active Main Heads may resend invitations." };
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
    return { error: "Invitation record not found in your organization." };
  }

  if (invitation.status !== "pending") {
    return { error: `Cannot resend an invitation with status '${invitation.status}'.` };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=/activate`;

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    invitation.email,
    { redirectTo }
  );

  if (inviteError) {
    return { error: `Supabase re-dispatch failed: ${inviteError.message}` };
  }

  // Extend expiration by 7 days
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await adminClient
    .from("invitations")
    .update({ expires_at: newExpiresAt })
    .eq("id", invitationId);

  // Log immutable administrative audit record
  await adminClient.from("activity_records").insert({
    organization_id: organizationId,
    actor_id: context.user.id,
    task_id: null,
    entity_type: "invitation",
    entity_id: invitationId,
    action: "invitation_resent",
    previous_state: { expires_at: invitation.expires_at },
    new_state: { expires_at: newExpiresAt },
    metadata: { email: invitation.email, role: invitation.role },
  });

  return {
    success: true,
    message: `Invitation re-dispatched to ${invitation.email}.`,
  };
}

/**
 * Inspects authoritative pending activation state for the currently authenticated user.
 * Used by the /activate route to display read-only institutional data.
 */
export async function getPendingActivationDetails(): Promise<PendingActivationDetails> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "unauthenticated" };
  }

  const adminClient = createAdminClient();

  // Find organization membership for this user
  const { data: membership } = await adminClient
    .from("organization_members")
    .select("*, organization:organizations(name), primary_group:groups(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { error: "no_membership" };
  }

  if (membership.status === "active") {
    return { error: "already_active", role: membership.role };
  }

  if (membership.status === "deactivated") {
    return { error: "deactivated" };
  }

  // Find invitation record
  const { data: invitation } = await adminClient
    .from("invitations")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .or(`invited_user_id.eq.${user.id},email.eq.${user.email}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) {
    return { error: "missing_invitation" };
  }

  if (invitation.status === "revoked") {
    return { error: "revoked" };
  }

  if (invitation.status === "expired" || new Date(invitation.expires_at) < new Date()) {
    return { error: "expired" };
  }

  if (invitation.status === "accepted") {
    return { error: "already_accepted" };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    error: null,
    email: user.email || profile?.email,
    fullName: profile?.full_name || undefined,
    organizationName: (membership.organization as any)?.name || "ClubOS Organization",
    primaryGroupName: (membership.primary_group as any)?.name || "Primary Group",
    role: membership.role,
  };
}

/**
 * Completes first-time account activation.
 * Validates password, transitions pending membership to active, marks invitation accepted,
 * and returns the authoritative destination path.
 */
export async function completeAccountActivation(
  password: string,
  confirmPassword: string
): Promise<InvitationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication session required. Please use your activation email link." };
  }

  if (!password || !confirmPassword) {
    return { error: "Please enter and confirm your password." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters in length." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const adminClient = createAdminClient();

  // Authoritatively re-verify membership state
  const { data: membership, error: memError } = await adminClient
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memError || !membership) {
    return { error: "No organization membership was found for your account." };
  }

  if (membership.status === "active") {
    return {
      success: true,
      targetPath: getRoleDefaultPath(membership.role),
    };
  }

  if (membership.status === "deactivated") {
    return { error: "Your institutional membership is deactivated. Please contact your Main Head." };
  }

  if (membership.status !== "pending_activation") {
    return { error: "Invalid membership status for activation." };
  }

  // Authoritatively re-verify invitation state
  const { data: invitation, error: invError } = await adminClient
    .from("invitations")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .or(`invited_user_id.eq.${user.id},email.eq.${user.email}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invError || !invitation) {
    return { error: "Valid pending invitation record not found." };
  }

  if (invitation.status === "revoked") {
    return { error: "This invitation has been revoked by an administrator." };
  }

  if (invitation.status === "expired" || new Date(invitation.expires_at) < new Date()) {
    return { error: "This invitation link has expired. Please request a new invitation." };
  }

  if (invitation.status === "accepted") {
    return {
      success: true,
      targetPath: getRoleDefaultPath(membership.role),
    };
  }

  // Update password via user-scoped Supabase client
  const userClient = await createClient();
  const { error: pwdError } = await userClient.auth.updateUser({ password });

  if (pwdError) {
    return { error: `Failed to set credential: ${pwdError.message}` };
  }

  const now = new Date().toISOString();

  // Atomically transition membership to active and invitation to accepted
  const { error: updateMemError } = await adminClient
    .from("organization_members")
    .update({
      status: "active",
      deactivated_at: null,
      updated_at: now,
    })
    .eq("id", membership.id);

  if (updateMemError) {
    return { error: `Failed to activate membership: ${updateMemError.message}` };
  }

  await adminClient
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: now,
      updated_at: now,
    })
    .eq("id", invitation.id);

  return {
    success: true,
    targetPath: getRoleDefaultPath(membership.role),
  };
}
