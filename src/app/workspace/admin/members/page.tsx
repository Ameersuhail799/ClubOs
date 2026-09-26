import React from "react";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext, getRoleDefaultPath } from "@/lib/auth/context";
import { getOrganizationMembers, getOrganizationGroups } from "@/lib/members/service";
import { PageContainer } from "@/components/layout/PageContainer";
import { MembersDirectoryClient } from "./MembersDirectoryClient";

export const dynamic = "force-dynamic";

export default async function MembersAdminPage() {
  const context = await getCurrentOrganizationContext();

  // Strict role boundary: Only Main Head can access Admin Console
  if (context.role !== "main_head") {
    redirect(getRoleDefaultPath(context.role || "member"));
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    redirect("/account-status?reason=no_membership");
  }

  // Load real institutional directory and organization groups
  const [members, groups] = await Promise.all([
    getOrganizationMembers(organizationId),
    getOrganizationGroups(organizationId),
  ]);

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        <MembersDirectoryClient
          initialMembers={members}
          groups={groups}
          organizationName={context.organization?.name || "Tinkers Hub"}
          currentUserId={context.user.id}
        />
      </PageContainer>
    </div>
  );
}
