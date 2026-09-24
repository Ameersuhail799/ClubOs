import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export default function MyDayPage() {
  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Scope & Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Personal Workbench</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">MEMBER SCOPE</StatusBadge>
            </div>
            <HeadlineMd>My Day</HeadlineMd>
            <BodyMd className="text-secondary">
              Personal execution priority queue, active deliverable focus, and private scratchpad.
            </BodyMd>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/workspace/tasks/sample-task">
              <Button variant="outline" size="sm">
                Open Task Inspector Sample
              </Button>
            </Link>
            <Button variant="secondary" size="sm" disabled>
              + Add Private Scratchpad
            </Button>
          </div>
        </div>

        {/* Member Focus Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left: Focus & Assigned */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <LabelCaps>Current Active Focus</LabelCaps>
                <StatusBadge variant="neutral" size="sm">CAPACITY: 0/3</StatusBadge>
              </div>
              <BodyMd className="text-secondary">
                No active subtask currently in progress. Select an assigned item below or claim an open volunteer subtask from your group.
              </BodyMd>
            </div>

            <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
              <LabelCaps>Assigned Deliverables</LabelCaps>
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <LabelCode size="sm" className="text-secondary">QUEUE EMPTY</LabelCode>
                <BodyMd className="text-secondary text-sm">
                  Subtasks delegated to you by your Group Head will appear here.
                </BodyMd>
              </div>
            </div>
          </div>

          {/* Right: Open for Volunteers / Claim Pool & Scratchpad */}
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
              <LabelCaps>Open to Claim (Group Pool)</LabelCaps>
              <BodyMd className="text-secondary text-sm">
                Tasks flagged by your Group Head as open for volunteer sign-up can be claimed with one click.
              </BodyMd>
              <div className="mt-4 pt-3 border-t border-outline-variant text-center">
                <LabelCode size="sm" className="text-secondary">NO OPEN CLAIMS</LabelCode>
              </div>
            </div>

            <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
              <LabelCaps>Private Scratchpad</LabelCaps>
              <BodyMd className="text-secondary text-sm">
                Private notes and quick thoughts. Strictly client-contained and never visible to heads or other members.
              </BodyMd>
              <textarea
                placeholder="Type temporary notes here..."
                rows={4}
                className="w-full p-2.5 rounded bg-surface-container-low border border-outline-variant text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
