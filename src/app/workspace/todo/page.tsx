import React from "react";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext, getRoleDefaultPath } from "@/lib/auth/context";
import { getMemberWorkbenchData } from "@/lib/tasks/service";
import { MemberWorkbenchContent } from "@/components/member/MemberWorkbenchContent";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps } from "@/components/ui/Typography";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user) {
    redirect("/login");
  }

  // Strict role boundary: Group Heads and Main Heads cannot use Member-only path
  if (context.role !== "member") {
    redirect(getRoleDefaultPath(context.role || "member"));
  }

  const result = await getMemberWorkbenchData();

  if (!result.success || !result.data) {
    return (
      <div className="py-12">
        <PageContainer>
          <div className="p-8 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3 max-w-lg mx-auto text-center items-center">
            <LabelCaps className="text-error font-bold">Workbench Unavailable</LabelCaps>
            <HeadlineMd>Unable to Load Todo</HeadlineMd>
            <BodyMd className="text-secondary">
              {result.error || "An error occurred while loading your personal scratchpad."}
            </BodyMd>
          </div>
        </PageContainer>
      </div>
    );
  }

  return <MemberWorkbenchContent initialData={result.data} initialTab="todo" />;
}
