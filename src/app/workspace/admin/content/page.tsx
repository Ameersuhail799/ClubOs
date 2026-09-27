import React from "react";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/auth/context";
import {
  getMainHeadEvents,
  getMainHeadAnnouncements,
  getMainHeadPublicContent,
} from "@/lib/content/service";
import { ContentManagerClient } from "@/components/admin/content/ContentManagerClient";

export const dynamic = "force-dynamic";

export default async function ContentManagementPage() {
  const context = await getCurrentOrganizationContext();

  // Authentication & Status Guards
  if (!context || !context.user) {
    redirect("/login?redirectTo=/workspace/admin/content");
  }

  if (context.error === "pending" || context.status === "pending_activation") {
    redirect("/account-status?reason=pending");
  }

  if (context.error === "deactivated" || context.status === "deactivated") {
    redirect("/account-status?reason=deactivated");
  }

  if (context.error === "no_membership" || !context.organization) {
    redirect("/account-status?reason=no_membership");
  }

  // Strict Role Guard: Main Head executive authority only
  if (context.role !== "main_head") {
    return (
      <div className="p-8 max-w-3xl mx-auto flex flex-col items-center justify-center text-center gap-4 py-20">
        <div className="p-3 rounded-full bg-error-container text-on-error-container text-2xl font-mono">
          403
        </div>
        <h2 className="text-headline-md font-bold text-on-surface">Access Denied</h2>
        <p className="text-body-md text-secondary">
          Only the Main Head possesses executive authorization to curate the public Club Space.
        </p>
      </div>
    );
  }

  // Load server-side organization data
  const [events, announcements, content] = await Promise.all([
    getMainHeadEvents(),
    getMainHeadAnnouncements(),
    getMainHeadPublicContent(),
  ]);

  return (
    <ContentManagerClient
      organizationName={context.organization.name}
      initialEvents={events}
      initialAnnouncements={announcements}
      initialContent={content}
    />
  );
}
