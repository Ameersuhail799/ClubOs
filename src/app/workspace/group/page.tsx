import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export default function GroupWorkspacePage() {
  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Scope & Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Group Operations</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">GROUP HEAD SCOPE</StatusBadge>
            </div>
            <HeadlineMd>Group Workspace</HeadlineMd>
            <BodyMd className="text-secondary">
              Division task delegation, member workload balance, and submission review queue.
            </BodyMd>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/workspace/tasks/sample-task">
              <Button variant="outline" size="sm">
                Open Task Inspector Sample
              </Button>
            </Link>
            <Button variant="primary" size="sm" disabled>
              + Delegate Subtask
            </Button>
          </div>
        </div>

        {/* Security Scope Notice */}
        <div className="p-4 rounded bg-surface-container-low border border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-label-code-md text-primary font-semibold">GROUP ENFORCEMENT:</span>
            <span className="text-body-sm text-secondary">
              Group Heads have strict operational access limited solely to their primary functional group.
            </span>
          </div>
          <StatusBadge variant="neutral" size="sm">ENFORCED SERVER-SIDE</StatusBadge>
        </div>

        {/* Placeholder Workboard Grid */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
            <LabelCaps>1. Directives & Tree</LabelCaps>
            <BodyMd className="text-secondary">
              Main directives accepted from Main Head ready for decomposition into leaf subtasks.
            </BodyMd>
            <div className="mt-auto pt-3 border-t border-outline-variant">
              <LabelCode size="sm" className="text-secondary">AWAITING TASK ENGINE</LabelCode>
            </div>
          </div>

          <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
            <LabelCaps>2. Member Workload Matrix</LabelCaps>
            <BodyMd className="text-secondary">
              Real-time member availability tracking (0/3 Available, 2/3 Active, 3/3 Saturated) to prevent over-allocation.
            </BodyMd>
            <div className="mt-auto pt-3 border-t border-outline-variant">
              <LabelCode size="sm" className="text-secondary">AWAITING ROSTER ENGINE</LabelCode>
            </div>
          </div>

          <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
            <LabelCaps>3. Review & Verification</LabelCaps>
            <BodyMd className="text-secondary">
              Subtasks completed by group members submitted for head verification before final closure.
            </BodyMd>
            <div className="mt-auto pt-3 border-t border-outline-variant">
              <LabelCode size="sm" className="text-secondary">AWAITING REVIEW PIPELINE</LabelCode>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
