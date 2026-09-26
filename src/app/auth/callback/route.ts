import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Route handler for Supabase authentication callbacks (invitations, password recovery).
 * Securely exchanges authentication code for a session and verifies institutional activation state.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/workspace";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const user = sessionData.user;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseUrl = isLocalEnv
    ? origin
    : forwardedHost
    ? `https://${forwardedHost}`
    : origin;

  // If callback is for account activation, perform authoritative pre-verification
  if (next.startsWith("/activate")) {
    const adminClient = createAdminClient();

    // 1. Locate membership
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("id, status, role, organization_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.redirect(`${baseUrl}/account-status?reason=no_membership`);
    }

    if (membership.status === "active") {
      return NextResponse.redirect(`${baseUrl}/workspace`);
    }

    if (membership.status === "deactivated") {
      return NextResponse.redirect(`${baseUrl}/account-status?reason=deactivated`);
    }

    // 2. Locate invitation record
    const { data: invitation } = await adminClient
      .from("invitations")
      .select("id, status, expires_at")
      .eq("organization_id", membership.organization_id)
      .or(`invited_user_id.eq.${user.id},email.eq.${user.email}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.redirect(`${baseUrl}/account-status?reason=invalid_invitation`);
    }

    if (invitation.status === "revoked") {
      return NextResponse.redirect(`${baseUrl}/account-status?reason=revoked_invitation`);
    }

    if (
      invitation.status === "expired" ||
      new Date(invitation.expires_at) < new Date()
    ) {
      return NextResponse.redirect(`${baseUrl}/account-status?reason=expired_invitation`);
    }

    if (invitation.status === "accepted") {
      return NextResponse.redirect(`${baseUrl}/workspace`);
    }

    return NextResponse.redirect(`${baseUrl}/activate`);
  }

  // Handle password reset or generic redirect
  return NextResponse.redirect(`${baseUrl}${next}`);
}
