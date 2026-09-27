"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { WorkboardTask, TaskStatus } from "@/lib/tasks/types";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";

interface WorkboardCardProps {
  task: WorkboardTask;
  onTransition: (taskId: string, targetStatus: TaskStatus, note?: string) => Promise<void>;
  isPending?: boolean;
}

export function WorkboardCard({ task, onTransition, isPending }: WorkboardCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPromptingAction, setIsPromptingAction] = useState<"block" | "request_changes" | null>(null);
  const [promptText, setPromptText] = useState("");

  // Deadline signal calculation
  const getDeadlineSignal = (deadline: string | null) => {
    if (!deadline) return null;
    const now = Date.now();
    const dueTime = new Date(deadline).getTime();
    if (isNaN(dueTime)) return null;

    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    if (diffHours < 0 && task.status !== "completed") {
      return { label: "Overdue", variant: "error" as const, text: new Date(deadline).toLocaleDateString() };
    }
    if (diffHours <= 48 && task.status !== "completed") {
      return { label: "Due Soon", variant: "warning" as const, text: new Date(deadline).toLocaleDateString() };
    }
    return { label: null, variant: "neutral" as const, text: new Date(deadline).toLocaleDateString() };
  };

  const deadlineSignal = getDeadlineSignal(task.deadline);

  // Status badge variant
  const getStatusVariant = (status: TaskStatus): StatusVariant => {
    switch (status) {
      case "assigned":
        return "pending";
      case "accepted":
        return "group";
      case "in_progress":
        return "active";
      case "ready_for_review":
        return "group";
      case "completed":
        return "success";
      case "blocked":
        return "error";
      case "cancelled":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
      case "assigned":
        return "Assigned";
      case "accepted":
        return "Accepted";
      case "in_progress":
        return "In Progress";
      case "ready_for_review":
        return "Review";
      case "completed":
        return "Completed";
      case "blocked":
        return "Blocked";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-700 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-amber-800 bg-amber-500/10 border-amber-500/30";
      case "medium":
        return "text-secondary bg-surface-container border-outline-variant";
      case "low":
        return "text-secondary/70 bg-surface-container-low border-outline-variant/60";
      default:
        return "text-secondary bg-surface-container border-outline-variant";
    }
  };

  const handleAction = async (targetStatus: TaskStatus, note?: string) => {
    setMenuOpen(false);
    setIsPromptingAction(null);
    setPromptText("");
    await onTransition(task.id, targetStatus, note);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        taskId: task.id,
        currentStatus: task.status,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const hasPermittedActions =
    task.canPerformActions.canAccept ||
    task.canPerformActions.canStart ||
    task.canPerformActions.canSubmitForReview ||
    task.canPerformActions.canComplete ||
    task.canPerformActions.canRequestChanges ||
    task.canPerformActions.canBlock ||
    task.canPerformActions.canUnblock;

  return (
    <div
      draggable={!isPending}
      onDragStart={handleDragStart}
      className={`group relative flex flex-col gap-2.5 p-3.5 rounded-lg bg-surface-container-lowest border transition-all select-none ${
        task.status === "blocked"
          ? "border-red-400 bg-red-500/5 shadow-sm"
          : "border-outline-variant hover:border-outline shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      } ${isPending ? "opacity-60 pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
    >
      {/* Top Header: Code, Priority & Action Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <LabelCode size="sm" className="text-secondary font-mono text-[11px]">
            {task.taskCode}
          </LabelCode>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider border ${getPriorityBadge(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
          {task.status === "blocked" && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white">
              BLOCKED
            </span>
          )}
        </div>

        {/* Keyboard-Accessible Action Menu Button */}
        {hasPermittedActions && (
          <div className="relative">
            <button
              type="button"
              aria-label={`Actions for task ${task.taskCode}`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 w-48 rounded-md bg-surface-container-lowest border border-outline-variant shadow-lg z-50 py-1 flex flex-col text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-secondary border-b border-outline-variant/50">
                    Workflow Actions
                  </div>

                  {task.canPerformActions.canAccept && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleAction("accepted")}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface transition-colors"
                    >
                      Accept Task
                    </button>
                  )}

                  {task.canPerformActions.canStart && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleAction("in_progress")}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface transition-colors"
                    >
                      Start Work
                    </button>
                  )}

                  {task.canPerformActions.canSubmitForReview && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleAction("ready_for_review")}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface transition-colors"
                    >
                      Submit for Review
                    </button>
                  )}

                  {task.canPerformActions.canComplete && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleAction("completed")}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container text-emerald-800 font-medium transition-colors"
                    >
                      Approve & Complete
                    </button>
                  )}

                  {task.canPerformActions.canRequestChanges && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setIsPromptingAction("request_changes")}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container text-amber-800 transition-colors"
                    >
                      Request Changes...
                    </button>
                  )}

                  {task.canPerformActions.canBlock && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setIsPromptingAction("block")}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container text-red-800 transition-colors"
                    >
                      Report Blocker...
                    </button>
                  )}

                  {task.canPerformActions.canUnblock && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleAction("in_progress", "__unblock__")}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-container text-emerald-800 transition-colors"
                    >
                      Resolve Blocker
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Title & Inspector Link */}
      <Link
        href={`/workspace/tasks/${task.id}`}
        className="text-sm font-semibold text-on-surface hover:text-primary transition-colors line-clamp-2 focus-visible:outline-none focus-visible:underline"
      >
        {task.title}
      </Link>

      {/* Description preview if present */}
      {task.description && (
        <p className="text-xs text-secondary line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Inline reason prompt for blocker or changes */}
      {isPromptingAction && (
        <div
          className="mt-1 p-2 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-1.5 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="font-semibold text-on-surface">
            {isPromptingAction === "block" ? "Reason for blocker:" : "Changes requested feedback:"}
          </label>
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder={isPromptingAction === "block" ? "e.g. Waiting on API credentials" : "e.g. Please update styling"}
            className="w-full px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-xs focus:outline-none focus:border-primary"
            autoFocus
          />
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <button
              type="button"
              onClick={() => setIsPromptingAction(null)}
              className="px-2 py-0.5 rounded text-secondary hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                handleAction(
                  isPromptingAction === "block" ? "blocked" : "in_progress",
                  promptText.trim() || undefined
                )
              }
              className="px-2 py-0.5 rounded bg-primary text-on-primary font-medium"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Metadata Footer: Status, Subtasks, Deadline, Assignee */}
      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-outline-variant/60">
        <div className="flex items-center justify-between text-xs text-secondary">
          {/* Status Badge */}
          <StatusBadge variant={getStatusVariant(task.status)} size="sm">
            {getStatusLabel(task.status)}
          </StatusBadge>

          {/* Subtasks Count Context */}
          {task.subtaskCount.total > 0 && (
            <span className="text-[11px] font-mono text-secondary bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/50">
              {task.subtaskCount.completed} / {task.subtaskCount.total} subtasks
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-secondary gap-2 flex-wrap">
          {/* Assignee / Responsible Head */}
          <div className="flex items-center gap-1 min-w-0">
            <span className="w-4 h-4 rounded-full bg-surface-container-high text-[9px] font-bold flex items-center justify-center text-secondary uppercase flex-shrink-0">
              {(task.assigneeName || task.assignedHeadName || "U")[0]}
            </span>
            <span className="truncate max-w-[120px] text-[11px]" title={task.assigneeName || task.assignedHeadName || "Unassigned"}>
              {task.assigneeName || task.assignedHeadName || "Unassigned"}
            </span>
          </div>

          {/* Deadline indicator */}
          {deadlineSignal && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {deadlineSignal.label && (
                <span
                  className={`px-1 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                    deadlineSignal.variant === "error"
                      ? "bg-red-500/10 text-red-700 border border-red-500/20"
                      : "bg-amber-500/10 text-amber-800 border border-amber-500/20"
                  }`}
                >
                  {deadlineSignal.label}
                </span>
              )}
              <span className="text-[11px] font-mono">{deadlineSignal.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
