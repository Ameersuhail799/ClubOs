import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext, getRoleDefaultPath } from "@/lib/auth/context";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export default async function CommandCenterPage() {
  const context = await getCurrentOrganizationContext();

  // Strict role boundary: Only Main Head can access Command Center
  if (context.role !== "main_head") {
    redirect(getRoleDefaultPath(context.role || "member"));
  }
  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Scope & Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Executive Operations</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">MAIN HEAD SCOPE</StatusBadge>
            </div>
            <HeadlineMd>Command Center</HeadlineMd>
            <BodyMd className="text-secondary">
              Centralized organizational ledger, cross-group task dispatch, and functional group health monitoring.
            </BodyMd>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/workspace/tasks/demo-01">
              <Button variant="outline" size="sm">
                Open Task Inspector Sample
              </Button>
            </Link>
            <Button variant="primary" size="sm" disabled>
              + Issue Main Directive
            </Button>
          </div>
        </div>

        {/* 5 Functional Groups Locked Blueprint */}
        <div className="pt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <LabelCaps>Institutional Functional Divisions (5 Locked Groups)</LabelCaps>
            <LabelCode size="sm" className="text-secondary">SECURITY MODEL: FULL ORG ACCESS</LabelCode>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {["Project Handling", "Event", "Finance", "Outreach", "Media & Documentation"].map((group) => (
              <div
                key={group}
                className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-label-code-sm text-secondary font-medium">GROUP</span>
                  <span className="font-sans text-body-md font-semibold text-on-surface">{group}</span>
                </div>
                <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-label-code-sm text-secondary">
                  <span>Capacity</span>
                  <StatusBadge variant="neutral" size="sm">IDLE</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder Directive Stream */}
        <div className="mt-8 p-8 rounded bg-surface-container-low border border-dashed border-outline-variant text-center flex flex-col items-center gap-2">
          <LabelCode size="md" className="text-secondary font-semibold">
            COMMAND CENTER DIRECTIVE REGISTRY
          </LabelCode>
          <BodyMd className="text-secondary max-w-md">
            The core task engine will be integrated in subsequent builds. Directives created here will dispatch to Group Heads for acceptance and member delegation.
          </BodyMd>
        </div>
      </PageContainer>
    </div>
  );
}
