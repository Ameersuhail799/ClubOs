import React from "react";
import Link from "next/link";
import { getCurrentOrganizationContext } from "@/lib/auth/context";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const context = await getCurrentOrganizationContext();

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Account Profile</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">
                {context.role?.replace("_", " ").toUpperCase() || "MEMBER"}
              </StatusBadge>
            </div>
            <HeadlineMd>{context.profile?.full_name || "Profile"}</HeadlineMd>
            <BodyMd className="text-secondary">
              Personal contributor credentials and functional group alignment.
            </BodyMd>
          </div>

          <Link href="/workspace/my-day">
            <Button variant="outline" size="sm">
              ← Back to My Day
            </Button>
          </Link>
        </div>

        <div className="max-w-xl mx-auto w-full p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 text-body-sm">
            <div>
              <span className="text-label-code-xs text-secondary block">Full Name</span>
              <strong className="text-on-surface">{context.profile?.full_name || "Unknown"}</strong>
            </div>
            <div>
              <span className="text-label-code-xs text-secondary block">Email</span>
              <strong className="text-on-surface">{context.user?.email || "Unknown"}</strong>
            </div>
            <div>
              <span className="text-label-code-xs text-secondary block">Organization</span>
              <strong className="text-on-surface">{context.organization?.name || "None"}</strong>
            </div>
            <div>
              <span className="text-label-code-xs text-secondary block">Primary Group</span>
              <strong className="text-on-surface">{context.primaryGroup?.name || "None"}</strong>
            </div>
            <div>
              <span className="text-label-code-xs text-secondary block">Role</span>
              <span className="font-mono uppercase text-label-code-sm text-primary font-bold">
                {context.role?.replace("_", " ") || "Member"}
              </span>
            </div>
            <div>
              <span className="text-label-code-xs text-secondary block">Status</span>
              <StatusBadge variant="success" size="sm">
                {context.status?.toUpperCase() || "ACTIVE"}
              </StatusBadge>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
