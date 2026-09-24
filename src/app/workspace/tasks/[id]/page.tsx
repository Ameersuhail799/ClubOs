import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

interface TaskInspectorPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskInspectorPage({ params }: TaskInspectorPageProps) {
  const { id } = await params;

  const tabs = [
    "Overview & Scope",
    "Subtasks & Tree",
    "Discussion",
    "Files & Specs",
    "What Changed (Audit)",
  ];

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Header & Task Identification */}
        <div className="flex flex-col gap-3 pb-6 border-b border-outline-variant">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link href="/workspace/command-center" className="text-body-sm text-secondary hover:text-on-surface">
                ← Workspace
              </Link>
              <span className="text-outline-variant">•</span>
              <LabelCode size="sm" className="text-primary font-bold">
                TASK ID: {id}
              </LabelCode>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="active" size="sm">IN PROGRESS</StatusBadge>
              <StatusBadge variant="group" size="sm">PROJECT HANDLING</StatusBadge>
            </div>
          </div>

          <HeadlineMd>Shared Task Inspector</HeadlineMd>
          <BodyMd className="text-secondary max-w-3xl">
            The Task is the central shared interactive object connecting Main Head, Group Head, and Member. It displays essential scope immediately and unlocks deep context progressively.
          </BodyMd>
        </div>

        {/* Dynamic Action Strip (Role-gated Treatment Placeholder) */}
        <div className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-label-code-sm text-secondary font-semibold">ROLE ACTIONS:</span>
            <span className="text-body-sm text-secondary">Context-aware based on authenticated user session</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm">
              Copy Deep Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="Safe WhatsApp task handoff with zero credentials"
            >
              WhatsApp Handoff
            </Button>
            <Button variant="primary" size="sm" disabled>
              Update Lifecycle State
            </Button>
          </div>
        </div>

        {/* Progressive Disclosure Tabs */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-outline-variant overflow-x-auto pb-1">
            {tabs.map((tab, idx) => (
              <button
                key={tab}
                type="button"
                className={`px-3 py-2 rounded-t font-sans text-body-sm font-medium whitespace-nowrap transition-colors ${
                  idx === 0
                    ? "border-b-2 border-primary text-primary font-semibold"
                    : "text-secondary hover:text-on-surface"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Active Tab Panel (Overview Boundary) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
              <LabelCaps>Scope & Deliverables Checklist</LabelCaps>
              <BodyMd className="text-secondary">
                Detailed task breakdown, acceptance criteria, and technical boundaries will be retrieved from the server-side database in Build 03.
              </BodyMd>
              <div className="p-4 rounded bg-surface-container-low border border-dashed border-outline-variant text-center">
                <LabelCode size="sm" className="text-secondary">
                  TASK DETAILS BOUNDARY • AWAITING DATABASE MODELS
                </LabelCode>
              </div>
            </div>

            <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
              <LabelCaps>Responsibility Hierarchy</LabelCaps>
              <div className="flex flex-col gap-3 font-mono text-label-code-sm">
                <div className="flex flex-col">
                  <span className="text-secondary">ORIGINATOR</span>
                  <span className="text-on-surface font-semibold">Main Head Directive</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary">FUNCTIONAL LEAD</span>
                  <span className="text-on-surface font-semibold">Group Head</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary">DELEGATEE / ASSIGNEE</span>
                  <span className="text-on-surface font-semibold">Member</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
