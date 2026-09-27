"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LabelCode } from "@/components/ui/Typography";
import {
  startTaskAction,
  submitTaskForReviewAction,
  blockTaskAction,
  unblockTaskAction,
} from "@/lib/tasks/actions";
import type { TaskWithDetails, TaskStatus } from "@/lib/tasks/types";

interface MemberTaskRowProps {
  task: TaskWithDetails;
  onRefresh?: () => void;
  defaultExpanded?: boolean;
}

export function MemberTaskRow({
  task,
  onRefresh,
  defaultExpanded = false,
}: MemberTaskRowProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Blocker prompt modal / inline input
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const getStatusVariant = (status: TaskStatus) => {
    switch (status) {
      case "assigned":
      case "accepted":
        return "pending";
      case "in_progress":
        return "active";
      case "ready_for_review":
        return "group";
      case "completed":
        return "success";
      case "blocked":
      case "cancelled":
        return "error";
      default:
        return "neutral";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-700 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-amber-700 bg-amber-500/10 border-amber-500/30";
      case "medium":
        return "text-blue-700 bg-blue-500/10 border-blue-500/30";
      default:
        return "text-secondary bg-surface-container border-outline-variant";
    }
  };

  const handleAction = (actionFn: () => Promise<any>) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await actionFn();
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const res = await blockTaskAction(task.id, blockReason.trim() || undefined);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        setIsBlocking(false);
        setBlockReason("");
        if (onRefresh) onRefresh();
      }
    });
  };

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded transition-colors hover:border-outline overflow-hidden">
      {/* Row Header (Click to toggle expansion) */}
      <div
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <StatusBadge variant={getStatusVariant(task.status)} size="sm">
            {task.status.toUpperCase()}
          </StatusBadge>

          <LabelCode size="sm" className="text-secondary font-bold flex-shrink-0">
            {task.task_code}
          </LabelCode>

          <span className="font-sans font-semibold text-body-sm sm:text-body-md text-on-surface truncate">
            {task.title}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border hidden sm:inline-block ${getPriorityBadgeColor(
              task.priority
            )}`}
          >
            {task.priority}
          </span>

          {formattedDeadline && (
            <span className="font-mono text-label-code-sm text-secondary hidden md:inline-block">
              Due {formattedDeadline}
            </span>
          )}

          {task.assignedHeadProfile && (
            <span className="font-sans text-label-code-sm bg-surface-container px-2 py-0.5 rounded text-secondary hidden lg:inline-block">
              {task.assignedHeadProfile.fullName}
            </span>
          )}

          <span
            className={`text-secondary text-sm transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Expanded Details Panel */}
      {isExpanded && (
        <div className="border-t border-outline-variant p-4 bg-surface-container-low/60 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-2.5 rounded bg-error/10 border border-error/30 text-error text-body-sm">
              ⚠ {errorMsg}
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1">
            <span className="font-sans text-label-code-xs text-secondary uppercase font-semibold">
              Description & Scope
            </span>
            <p className="font-sans text-body-sm text-on-surface leading-relaxed">
              {task.description || "No detailed description provided by group lead."}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-label-code-sm">
            {task.parentTask && (
              <div className="p-2 rounded bg-surface-container border border-outline-variant flex items-center justify-between">
                <span className="text-secondary">Parent Directive:</span>
                <span className="font-bold text-on-surface truncate max-w-[150px]">
                  {(task.parentTask as any).taskCode || (task.parentTask as any).task_code}
                </span>
              </div>
            )}

            <div className="p-2 rounded bg-surface-container border border-outline-variant flex items-center justify-between">
              <span className="text-secondary">Deadline:</span>
              <span className="font-medium text-on-surface">
                {task.deadline ? new Date(task.deadline).toLocaleDateString() : "Open"}
              </span>
            </div>

            <div className="p-2 rounded bg-surface-container border border-outline-variant flex items-center justify-between">
              <span className="text-secondary">Priority:</span>
              <span className="font-mono uppercase font-semibold text-on-surface">
                {task.priority}
              </span>
            </div>
          </div>

          {/* Inline Blocker Form */}
          {isBlocking && (
            <form onSubmit={handleBlockSubmit} className="p-3 rounded bg-surface-container border border-error/30 flex flex-col gap-2">
              <label className="text-label-code-sm font-semibold text-error">
                Report Blocker / Impediment
              </label>
              <textarea
                rows={2}
                placeholder="Describe what is blocking completion (dependencies, access, clarification)..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                disabled={isPending}
                className="w-full p-2 rounded bg-surface border border-outline text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-error resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setIsBlocking(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                >
                  {isPending ? "Submitting..." : "Confirm Blocker"}
                </Button>
              </div>
            </form>
          )}

          {/* Action Strip (Role-safe) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant">
            <div className="flex flex-wrap items-center gap-2">
              {/* Start Work (assigned -> in_progress) */}
              {task.status === "assigned" && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAction(() => startTaskAction(task.id))}
                >
                  {isPending ? "Starting..." : "Start Work"}
                </Button>
              )}

              {/* In Progress actions: Submit for Review & Report Blocker */}
              {task.status === "in_progress" && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleAction(() => submitTaskForReviewAction(task.id))}
                  >
                    {isPending ? "Submitting..." : "Submit for Review"}
                  </Button>
                  {!isBlocking && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setIsBlocking(true)}
                    >
                      Report Blocker
                    </Button>
                  )}
                </>
              )}

              {/* Blocked action: Resolve Blocker */}
              {task.status === "blocked" && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAction(() => unblockTaskAction(task.id))}
                >
                  {isPending ? "Resolving..." : "Resolve Blocker"}
                </Button>
              )}

              {/* Ready for Review status indication */}
              {task.status === "ready_for_review" && (
                <span className="text-label-code-sm text-secondary bg-surface-container px-2 py-1 rounded border border-outline-variant">
                  Awaiting Lead Verification & Completion
                </span>
              )}
            </div>

            <Link href={`/workspace/tasks/${task.id}`}>
              <Button variant="outline" size="sm">
                Open in Task Inspector →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
