"use server";

import { redirect } from "next/navigation";
import {
  createInstitutionalInvitation,
  resendInstitutionalInvitation,
  completeAccountActivation,
  type InvitationResult,
} from "@/lib/invitations/service";
import type { UserRole } from "@/lib/auth/context";

/**
 * Server Action for Main Head to create an institutional invitation.
 */
export async function createInvitationAction(
  prevState: InvitationResult | null,
  formData: FormData
): Promise<InvitationResult> {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = (formData.get("phone") as string) || undefined;
  const role = formData.get("role") as UserRole;
  const primaryGroupId = formData.get("primaryGroupId") as string;

  return await createInstitutionalInvitation({
    fullName,
    email,
    phone,
    role,
    primaryGroupId,
  });
}

/**
 * Server Action for Main Head to resend an institutional invitation.
 */
export async function resendInvitationAction(
  prevState: InvitationResult | null,
  formData: FormData
): Promise<InvitationResult> {
  const invitationId = formData.get("invitationId") as string;
  if (!invitationId) {
    return { error: "Invitation ID is required." };
  }
  return await resendInstitutionalInvitation(invitationId);
}

/**
 * Server Action for the invited user to complete account activation.
 */
export async function activateAccountAction(
  prevState: InvitationResult | null,
  formData: FormData
): Promise<InvitationResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const result = await completeAccountActivation(password, confirmPassword);

  if (result.success && result.targetPath) {
    redirect(result.targetPath);
  }

  return result;
}
