"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HeadlineMd, LabelCode } from "@/components/ui/Typography";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import type { TaskWithFullDetails, TaskStatus, TaskPriority } from "@/lib/tasks/types";

interface TaskHeaderProps {
  task: TaskWithFullDetails;
}

export function TaskHeader({ task }: TaskHeaderProps) {
  const [copied, setCopied] = useState(false);

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

  const priorityStyles: Record<TaskPriority, string> = {
    low: "bg-surface-container text-secondary border-outline-variant",
    medium: "bg-surface-container-high text-on-surface border-outline-variant",
    high: "bg-secondary-container text-on-secondary-fixed-variant border-outline-variant font-medium",
    urgent: "bg-error-container text-on-error-container border-error/20 font-bold animate-pulse",
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No Deadline";

  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-outline-variant">
      {/* Top Breadcrumb & Metadata Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/workspace"
            className="text-body-sm text-secondary hover:text-on-surface transition-colors"
          >
            ← Workspace
          </Link>
          <span className="text-outline-variant">•</span>
          <LabelCode size="sm" className="text-primary font-bold tracking-tight">
            {task.task_code}
          </LabelCode>
          {task.parentTaskDetail && (
            <>
              <span className="text-outline-variant">•</span>
              <span className="text-body-sm text-secondary">
                Parent:{" "}
                <Link
                  href={`/workspace/tasks/${task.parentTaskDetail.id}`}
                  className="font-mono text-primary font-semibold hover:underline"
                >
                  {task.parentTaskDetail.taskCode}
                </Link>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-body-sm h-7 px-2.5 font-mono"
          >
            {copied ? "Link Copied ✓" : "Copy Link"}
          </Button>
        </div>
      </div>

      {/* Task Title & Primary Badges */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={statusVariantMap[task.status]} size="sm">
              {statusLabelMap[task.status]}
            </StatusBadge>
            <span
              className={`inline-flex items-center justify-center font-mono rounded-full border uppercase tracking-wider text-[10px] h-5 px-2 select-none leading-none ${
                priorityStyles[task.priority]
              }`}
            >
              Priority: {task.priority}
            </span>
            {task.primaryGroup && (
              <span className="inline-flex items-center justify-center font-mono rounded-full border border-outline-variant bg-surface-container-highest text-primary text-[10px] h-5 px-2 font-semibold uppercase tracking-wider select-none leading-none">
                Group: {task.primaryGroup.name}
              </span>
            )}
            {task.is_volunteer_pool && (
              <span className="inline-flex items-center justify-center font-mono rounded-full border border-tertiary/20 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] h-5 px-2 font-medium uppercase tracking-wider select-none leading-none">
                Open Volunteer Pool
              </span>
            )}
          </div>

          <HeadlineMd className="text-on-surface text-xl sm:text-2xl font-bold tracking-tight">
            {task.title}
          </HeadlineMd>
        </div>

        {/* Compact Key Stats */}
        <div className="flex flex-wrap md:flex-col items-start md:items-end gap-1.5 font-mono text-label-code-sm text-secondary bg-surface-container-low md:bg-transparent p-3 md:p-0 rounded border md:border-none border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="text-secondary">TARGET DUE:</span>
            <span className="text-on-surface font-semibold">{formattedDeadline}</span>
          </div>
          {task.assignedHeadProfile && (
            <div className="flex items-center gap-2">
              <span className="text-secondary">HEAD LEAD:</span>
              <span className="text-on-surface font-semibold">
                {task.assignedHeadProfile.fullName}
              </span>
            </div>
          )}
          {task.assigneeProfile && (
            <div className="flex items-center gap-2">
              <span className="text-secondary">ASSIGNEE:</span>
              <span className="text-on-surface font-semibold">
                {task.assigneeProfile.fullName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
