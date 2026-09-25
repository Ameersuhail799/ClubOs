import { redirect } from "next/navigation";
import { getCurrentOrganizationContext, getRoleDefaultPath } from "@/lib/auth/context";

/**
 * Root workspace router.
 * Evaluates the user's authoritative database role and routes them directly to their designated dashboard.
 */
export default async function WorkspaceRootPage() {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user) {
    redirect("/login");
  }

  if (context.error === "pending") {
    redirect("/account-status?reason=pending");
  }

  if (context.error === "deactivated") {
    redirect("/account-status?reason=deactivated");
  }

  if (context.error === "no_membership") {
    redirect("/account-status?reason=no_membership");
  }

  if (context.role) {
    redirect(getRoleDefaultPath(context.role));
  }

  redirect("/workspace/my-day");
}
