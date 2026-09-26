import React from "react";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext, getRoleDefaultPath } from "@/lib/auth/context";
import { getGroupWorkspaceData } from "@/lib/tasks/service";
import { GroupWorkspaceContent } from "@/components/group/GroupWorkspaceContent";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps } from "@/components/ui/Typography";

export const dynamic = "force-dynamic";

export default async function GroupWorkspacePage() {
  const context = await getCurrentOrganizationContext();

  // Strict role boundary: Ordinary members cannot access Group Head workspace
  if (context.role === "member") {
    redirect(getRoleDefaultPath("member"));
  }

  // Fetch group workspace data strictly scoped to user's assigned group
  const result = await getGroupWorkspaceData();

  if (!result.success || !result.data) {
    return (
      <div className="py-12">
        <PageContainer>
          <div className="p-8 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3 max-w-lg mx-auto text-center items-center">
            <LabelCaps className="text-error font-bold">Workspace Access Issue</LabelCaps>
            <HeadlineMd>Group Workspace Unavailable</HeadlineMd>
            <BodyMd className="text-secondary">
              {result.error ||
                "No primary functional group assigned to your profile. Please contact institutional leadership."}
            </BodyMd>
          </div>
        </PageContainer>
      </div>
    );
  }

  return <GroupWorkspaceContent initialData={result.data} />;
}
