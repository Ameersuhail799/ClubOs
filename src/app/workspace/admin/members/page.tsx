import React from "react";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext, getRoleDefaultPath } from "@/lib/auth/context";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export default async function MembersAdminPage() {
  const context = await getCurrentOrganizationContext();

  // Strict role boundary: Only Main Head can access Admin Console
  if (context.role !== "main_head") {
    redirect(getRoleDefaultPath(context.role || "member"));
  }

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Administration & Registry</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">MAIN HEAD EXCLUSIVE</StatusBadge>
            </div>
            <HeadlineMd>Member & Account Management</HeadlineMd>
            <BodyMd className="text-secondary">
              Master institutional directory, role provisioning, primary group assignment, and credential state recovery.
            </BodyMd>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" disabled>
              + Register New Member
            </Button>
          </div>
        </div>

        {/* Member Governance Policy Box */}
        <div className="p-4 rounded bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-label-code-sm text-primary font-semibold">
              MEMBER RULE: EXACTLY ONE PRIMARY GROUP
            </span>
            <span className="text-body-sm text-secondary">
              Users cannot select or modify their own role or group. Server-side authorization enforces every operation.
            </span>
          </div>
          <StatusBadge variant="neutral" size="sm">SECURITY LOCKED</StatusBadge>
        </div>

        {/* Placeholder Registry Table */}
        <div className="rounded bg-surface-container-lowest border border-outline-variant overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between">
            <LabelCaps>Institutional Member Ledger</LabelCaps>
            <LabelCode size="sm" className="text-secondary">AWAITING DATABASE ENGINE</LabelCode>
          </div>

          <div className="p-12 text-center flex flex-col items-center gap-3">
            <LabelCode size="md" className="text-secondary">
              DIRECTORY BOUNDARY INITIALIZED
            </LabelCode>
            <BodyMd className="text-secondary max-w-md">
              Real member rosters, role management, activation token generation, and account deactivation controls will be wired to backend models in subsequent builds.
            </BodyMd>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
