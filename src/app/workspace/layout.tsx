import React from "react";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/auth/context";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getCurrentOrganizationContext();

  // Defense-in-depth: Even if middleware let the request pass, verify full membership
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

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <WorkspaceHeader
        userEmail={context.user.email}
        userName={context.profile?.full_name}
        role={context.role}
        organizationName={context.organization?.name}
        primaryGroupName={context.primaryGroup?.name}
      />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
