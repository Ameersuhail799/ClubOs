"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { TaskCreationDrawer } from "@/components/tasks/TaskCreationDrawer";
import type { TaskWithDetails, EligibleGroupHead, TaskRow, TaskStatus } from "@/lib/tasks/types";

interface GroupData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface CommandCenterContentProps {
  initialGroups: GroupData[];
  initialGroupHeads: EligibleGroupHead[];
  initialDirectives: TaskWithDetails[];
}

export function CommandCenterContent({
  initialGroups,
  initialGroupHeads,
  initialDirectives,
}: CommandCenterContentProps) {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [directives, setDirectives] = useState<TaskWithDetails[]>(initialDirectives);

  const statusVariantMap: Record<TaskStatus, StatusVariant> = {
    draft: "neutral",
    assigned: "pending",
    accepted: "group",
    in_progress: "active",
    ready_for_review: "group",
    completed: "success",
    blocked: "error",
    cancelled: "neutral",
  };

  const statusLabelMap: Record<TaskStatus, string> = {
    draft: "Draft",
    assigned: "Assigned",
    accepted: "Accepted",
    in_progress: "In Progress",
    ready_for_review: "Ready for Review",
    completed: "Completed",
    blocked: "Blocked",
    cancelled: "Cancelled",
  };

  const handleTaskCreated = (newTask: TaskRow) => {
    // Optimistically prepend to directive list and refresh server state
    const matchedGroup = initialGroups.find((g) => g.id === newTask.primary_group_id);
    const matchedHead = initialGroupHeads.find((gh) => gh.userId === newTask.assigned_head_id);

    const taskWithDetails: TaskWithDetails = {
      ...newTask,
      primaryGroup: matchedGroup || null,
      assignedHeadProfile: matchedHead
        ? { id: matchedHead.userId, fullName: matchedHead.fullName, email: matchedHead.email }
        : null,
    };

    setDirectives((prev) => [taskWithDetails, ...prev.filter((d) => d.id !== newTask.id)]);
    router.refresh();
  };

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Scope & Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Executive Operations</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">
                MAIN HEAD SCOPE
              </StatusBadge>
            </div>
            <HeadlineMd>Command Center</HeadlineMd>
            <BodyMd className="text-secondary">
              Centralized organizational ledger, cross-group task dispatch, and functional group
              health monitoring.
            </BodyMd>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/workspace/tasks/demo-01">
              <Button variant="outline" size="sm">
                Open Task Inspector Sample
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
            >
              + Create Task
            </Button>
          </div>
        </div>

        {/* 5 Functional Groups Locked Blueprint */}
        <div className="pt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <LabelCaps>Institutional Functional Divisions (5 Locked Groups)</LabelCaps>
            <LabelCode size="sm" className="text-secondary">
              SECURITY MODEL: FULL ORG ACCESS
            </LabelCode>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {initialGroups.map((group) => {
              const activeCount = directives.filter(
                (d) =>
                  d.primary_group_id === group.id &&
                  d.status !== "completed" &&
                  d.status !== "cancelled"
              ).length;

              return (
                <div
                  key={group.id}
                  className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-label-code-sm text-secondary font-medium">
                      GROUP
                    </span>
                    <span className="font-sans text-body-md font-semibold text-on-surface">
                      {group.name}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-label-code-sm text-secondary">
                    <span>Active Tasks</span>
                    <StatusBadge variant={activeCount > 0 ? "active" : "neutral"} size="sm">
                      {activeCount > 0 ? `${activeCount} ACTIVE` : "IDLE"}
                    </StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Directive Registry */}
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LabelCaps>Institutional Directive Registry</LabelCaps>
              <span className="text-outline-variant">•</span>
              <span className="font-mono text-label-code-sm text-secondary">
                {directives.length} TOTAL
              </span>
            </div>
          </div>

          {directives.length > 0 ? (
            <div className="rounded border border-outline-variant bg-surface-container-lowest overflow-hidden divide-y divide-outline-variant">
              {directives.map((directive) => {
                const deadlineFormatted = directive.deadline
                  ? new Date(directive.deadline).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No Deadline";

                return (
                  <div
                    key={directive.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <LabelCode size="sm" className="text-primary font-bold">
                          {directive.task_code}
                        </LabelCode>
                        <StatusBadge
                          variant={statusVariantMap[directive.status] || "neutral"}
                          size="sm"
                        >
                          {statusLabelMap[directive.status] || directive.status}
                        </StatusBadge>
                        <span className="text-label-code-sm font-mono text-secondary uppercase text-[10px] px-1.5 py-0.5 rounded border border-outline-variant bg-surface-container">
                          {directive.priority}
                        </span>
                        {directive.primaryGroup && (
                          <StatusBadge variant="group" size="sm">
                            {directive.primaryGroup.name}
                          </StatusBadge>
                        )}
                      </div>

                      <h4 className="font-sans font-semibold text-body-md text-on-surface truncate">
                        {directive.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 text-body-sm text-secondary">
                        <span>
                          Head:{" "}
                          <strong className="text-on-surface">
                            {directive.assignedHeadProfile?.fullName || "Unassigned"}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>Due: {deadlineFormatted}</span>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <Link
                        href={`/workspace/tasks/${directive.id}`}
                        className="inline-flex items-center justify-center font-mono text-body-sm h-8 px-3.5 rounded border border-outline-variant bg-surface-container-lowest text-primary hover:bg-surface-container transition-colors"
                      >
                        Inspect Directive →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded bg-surface-container-low border border-dashed border-outline-variant text-center flex flex-col items-center gap-2">
              <LabelCode size="md" className="text-secondary font-semibold">
                COMMAND CENTER DIRECTIVE REGISTRY
              </LabelCode>
              <BodyMd className="text-secondary max-w-md">
                No institutional directives have been dispatched yet. Click "+ Create Task" above
                to issue a directive to a functional group.
              </BodyMd>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsDrawerOpen(true)}
                >
                  + Create First Directive
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>

      {/* Task Creation Drawer */}
      <TaskCreationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        groups={initialGroups}
        groupHeads={initialGroupHeads}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
