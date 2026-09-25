"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext, getRoleDefaultPath } from "@/lib/auth/context";

export interface AuthActionResult {
  error?: string | null;
  success?: boolean;
  message?: string | null;
}

/**
 * Production Server Action for Email/Password Sign In.
 * Resolves authoritative role and organization status, then directs user accordingly.
 */
export async function signInAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string)?.trim();

  if (!email || !password) {
    return { error: "Please enter both institutional email and password." };
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // Provide clean, secure user-facing error without leaking database/auth internals
    if (
      signInError.message.includes("Invalid login credentials") ||
      signInError.message.includes("invalid_grant")
    ) {
      return { error: "Invalid email or password. Please verify your credentials." };
    }
    if (signInError.message.includes("Email not confirmed")) {
      return { error: "Account email has not been activated. Contact your Main Head." };
    }
    return { error: "Unable to sign in. Please check your credentials or try again later." };
  }

  // Authoritatively resolve organizational context
  const context = await getCurrentOrganizationContext();

  if (context.error === "pending") {
    redirect("/account-status?reason=pending");
  }

  if (context.error === "deactivated") {
    redirect("/account-status?reason=deactivated");
  }

  if (context.error === "no_membership") {
    redirect("/account-status?reason=no_membership");
  }

  // If user requested a specific workspace path and is active, honor it
  if (redirectTo && redirectTo.startsWith("/workspace")) {
    redirect(redirectTo);
  }

  // Otherwise, route to authoritative role entry point
  if (context.role) {
    redirect(getRoleDefaultPath(context.role));
  }

  redirect("/workspace/my-day");
}

/**
 * Production Server Action for Signing Out.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Production Server Action for Requesting Password Recovery.
 */
export async function recoverPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    return { error: "Please enter your institutional email." };
  }

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    // Return standard generic response to prevent account enumeration attacks
    return {
      success: true,
      message:
        "If your institutional email is registered with ClubOS, recovery instructions have been dispatched.",
    };
  }

  return {
    success: true,
    message:
      "If your institutional email is registered with ClubOS, recovery instructions have been dispatched.",
  };
}

/**
 * Production Server Action for Setting a New Password.
 */
export async function resetPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Please enter and confirm your new password." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters in length." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match. Please re-enter." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      error: "Unable to update password. Your recovery session may have expired. Please request a new recovery link.",
    };
  }

  redirect("/login?message=password_updated");
}
