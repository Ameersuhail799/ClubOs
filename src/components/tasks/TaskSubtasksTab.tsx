"use client";

import React from "react";
import Link from "next/link";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import type { TaskWithFullDetails, TaskStatus } from "@/lib/tasks/types";

interface TaskSubtasksTabProps {
  task: TaskWithFullDetails;
  onRefresh?: () => void;
}

export function TaskSubtasksTab({ task }: TaskSubtasksTabProps) {
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

  const completedSubtasks = task.subtasks.filter((s) => s.status === "completed").length;
  const totalSubtasks = task.subtasks.length;
  const progressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Subtask Summary */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <LabelCaps className="text-secondary font-semibold">Subtask Delegation Tree</LabelCaps>
          <div className="flex items-center gap-3">
            <span className="font-mono text-label-code-md text-on-surface font-semibold">
              {completedSubtasks} / {totalSubtasks} Completed ({progressPct}%)
            </span>
            <div className="w-32 h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subtask Hierarchical List */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
        <LabelCaps className="text-secondary font-semibold">Child Subtasks</LabelCaps>

        {task.subtasks.length > 0 ? (
          <div className="flex flex-col divide-y divide-outline-variant border border-outline-variant rounded overflow-hidden">
            {task.subtasks.map((subtask, index) => {
              const formattedDate = subtask.deadline
                ? new Date(subtask.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "No Date";

              return (
                <div
                  key={subtask.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                >
                  {/* Indentation Indicator & Subtask Info */}
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-secondary text-label-code-sm pt-0.5 select-none">
                      ↳ {index + 1}.
                    </span>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <LabelCode size="sm" className="text-primary font-bold">
                          {subtask.taskCode}
                        </LabelCode>
                        <StatusBadge variant={statusVariantMap[subtask.status]} size="sm">
                          {statusLabelMap[subtask.status]}
                        </StatusBadge>
                        <span className="text-label-code-sm font-mono text-secondary uppercase text-[10px] px-1.5 py-0.5 rounded border border-outline-variant bg-surface-container">
                          {subtask.priority}
                        </span>
                      </div>
                      <span className="font-sans text-body-md font-semibold text-on-surface">
                        {subtask.title}
                      </span>
                      <div className="flex items-center gap-2 text-body-sm text-secondary">
                        <span>
                          Assignee:{" "}
                          <strong className="text-on-surface">
                            {subtask.assigneeName || "Unassigned"}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>Due: {formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Open Child Task Link */}
                  <div className="flex items-center sm:self-center shrink-0">
                    <Link
                      href={`/workspace/tasks/${subtask.id}`}
                      className="inline-flex items-center justify-center font-mono text-body-sm h-7 px-3 rounded border border-outline-variant bg-surface-container-lowest text-primary hover:bg-surface-container transition-colors"
                    >
                      Open Subtask →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded bg-surface-container-low border border-dashed border-outline-variant text-center flex flex-col items-center gap-2">
            <span className="font-sans text-body-md text-on-surface font-medium">
              No child subtasks have been delegated under this directive yet.
            </span>
            <span className="text-body-sm text-secondary max-w-md">
              Child subtasks assigned under this directive will appear here in the operational hierarchy.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
