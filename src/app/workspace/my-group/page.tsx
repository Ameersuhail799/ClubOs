import React from "react";
import Link from "next/link";
import { getCurrentOrganizationContext } from "@/lib/auth/context";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function MyGroupPage() {
  const context = await getCurrentOrganizationContext();

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Division Directory</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">
                {context.primaryGroup?.name?.toUpperCase() || "MY GROUP"}
              </StatusBadge>
            </div>
            <HeadlineMd>{context.primaryGroup?.name || "Functional Group"}</HeadlineMd>
            <BodyMd className="text-secondary">
              {context.primaryGroup?.description || "Your assigned functional group within the organization."}
            </BodyMd>
          </div>

          <Link href="/workspace/my-day">
            <Button variant="outline" size="sm">
              ← Back to My Day
            </Button>
          </Link>
        </div>

        <div className="p-8 rounded bg-surface-container-lowest border border-outline-variant text-center flex flex-col items-center justify-center gap-2">
          <LabelCode size="sm" className="text-secondary">
            ROSTER VIEW
          </LabelCode>
          <BodyMd className="text-secondary max-w-md">
            Assigned to {context.primaryGroup?.name || "your functional group"}. Full member collaboration roster is managed by your Group Head.
          </BodyMd>
        </div>
      </PageContainer>
    </div>
  );
}
