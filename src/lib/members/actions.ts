"use server";

import { revalidatePath } from "next/cache";
import {
  revokeInstitutionalInvitation,
  resetMemberAccess,
  deactivateMember,
  reactivateMember,
  type MemberActionResult,
} from "@/lib/members/service";
import {
  createInstitutionalInvitation,
  resendInstitutionalInvitation,
  type InvitationResult,
} from "@/lib/invitations/service";
import type { UserRole } from "@/lib/auth/context";

/**
 * Server action to create a new Member or Group Head institutional invitation.
 * Strictly prevents creating Main Head accounts through this administrative flow.
 */
export async function createMemberInvitationAction(
  prevState: InvitationResult | null,
  formData: FormData
): Promise<InvitationResult> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() || undefined;
  const role = (formData.get("role") as string) as UserRole;
  const primaryGroupId = formData.get("primaryGroupId") as string;

  if (!fullName) {
    return { error: "Full name is required." };
  }

  if (!email) {
    return { error: "Institutional email address is required." };
  }

  if (role === "main_head") {
    return { error: "Security Restriction: Main Head accounts cannot be provisioned through this interface." };
  }

  if (!["group_head", "member"].includes(role)) {
    return { error: "Role must be either Member or Group Head." };
  }

  if (!primaryGroupId) {
    return { error: "A primary functional group must be assigned." };
  }

  const result = await createInstitutionalInvitation({
    fullName,
    email,
    phone,
    role,
    primaryGroupId,
  });

  if (result.success) {
    revalidatePath("/workspace/admin/members");
  }

  return result;
}

/**
 * Server action to re-dispatch a pending invitation email.
 */
export async function resendMemberInvitationAction(
  invitationId: string
): Promise<MemberActionResult> {
  if (!invitationId) {
    return { error: "Invitation ID is required." };
  }

  const result = await resendInstitutionalInvitation(invitationId);
  if (result.success) {
    revalidatePath("/workspace/admin/members");
  }
  return result;
}

/**
 * Server action to revoke an active pending invitation.
 */
export async function revokeInvitationAction(
  invitationId: string
): Promise<MemberActionResult> {
  if (!invitationId) {
    return { error: "Invitation ID is required." };
  }

  const result = await revokeInstitutionalInvitation(invitationId);
  if (result.success) {
    revalidatePath("/workspace/admin/members");
  }
  return result;
}

/**
 * Server action to initiate password recovery for an active member.
 */
export async function resetAccessAction(
  memberId: string
): Promise<MemberActionResult> {
  if (!memberId) {
    return { error: "Member ID is required." };
  }

  const result = await resetMemberAccess(memberId);
  return result;
}

/**
 * Server action to deactivate a member account.
 */
export async function deactivateMemberAction(
  memberId: string
): Promise<MemberActionResult> {
  if (!memberId) {
    return { error: "Member ID is required." };
  }

  const result = await deactivateMember(memberId);
  if (result.success) {
    revalidatePath("/workspace/admin/members");
  }
  return result;
}

/**
 * Server action to reactivate a deactivated member account.
 */
export async function reactivateMemberAction(
  memberId: string
): Promise<MemberActionResult> {
  if (!memberId) {
    return { error: "Member ID is required." };
  }

  const result = await reactivateMember(memberId);
  if (result.success) {
    revalidatePath("/workspace/admin/members");
  }
  return result;
}
