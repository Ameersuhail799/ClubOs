import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function NotificationsPage() {
  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Context Bar */}
        <div className="flex flex-col gap-1 pb-6 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <LabelCaps className="text-primary font-bold">Workspace Center</LabelCaps>
            <span className="text-outline-variant">•</span>
            <StatusBadge variant="neutral" size="sm">DUAL STREAM</StatusBadge>
          </div>
          <HeadlineMd>Notifications & What Changed</HeadlineMd>
          <BodyMd className="text-secondary">
            Separated alert stream for direct assignments/mentions and granular audit ledger for institutional state changes.
          </BodyMd>
        </div>

        {/* Dual Stream Split Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stream 1: Direct Notifications */}
          <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <LabelCaps>1. Direct Notifications</LabelCaps>
              <LabelCode size="sm" className="text-secondary">0 UNREAD</LabelCode>
            </div>
            <BodyMd className="text-secondary">
              Direct task assignments, review requests, and specific `@mentions` requiring your attention.
            </BodyMd>
            <div className="py-10 text-center flex flex-col items-center gap-1 border-t border-outline-variant">
              <LabelCode size="sm" className="text-secondary">NO UNREAD NOTIFICATIONS</LabelCode>
            </div>
          </div>

          {/* Stream 2: What Changed Audit Trail */}
          <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <LabelCaps>2. What Changed (State Audit)</LabelCaps>
              <LabelCode size="sm" className="text-secondary">ORGANIZATION FEED</LabelCode>
            </div>
            <BodyMd className="text-secondary">
              Granular timeline of task lifecycle changes, reassignments, and milestone approvals across permitted scopes.
            </BodyMd>
            <div className="py-10 text-center flex flex-col items-center gap-1 border-t border-outline-variant">
              <LabelCode size="sm" className="text-secondary">AUDIT FEED QUIET</LabelCode>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
