"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { delegateTaskAction } from "@/lib/tasks/actions";
import type { TaskWithFullDetails, TaskStatus, TaskPriority } from "@/lib/tasks/types";

interface TaskSubtasksTabProps {
  task: TaskWithFullDetails;
  onRefresh?: () => void;
}

export function TaskSubtasksTab({ task, onRefresh }: TaskSubtasksTabProps) {
  const [isDelegating, setIsDelegating] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState("");
  const [subtaskDeadline, setSubtaskDeadline] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState<TaskPriority>("medium");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const canDelegate =
    (task.currentUserRole === "main_head" || task.currentUserRole === "group_head") &&
    task.status !== "completed" &&
    task.status !== "cancelled";

  const completedSubtasks = task.subtasks.filter((s) => s.status === "completed").length;
  const totalSubtasks = task.subtasks.length;
  const progressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleDelegateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim() || !subtaskAssigneeId) {
      setErrorMsg("Title and assignee are required to delegate a subtask.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("parentTaskId", task.id);
      formData.set("title", subtaskTitle.trim());
      if (subtaskDescription.trim()) formData.set("description", subtaskDescription.trim());
      formData.set("assigneeId", subtaskAssigneeId);
      if (subtaskDeadline) formData.set("deadline", new Date(subtaskDeadline).toISOString());
      formData.set("priority", subtaskPriority);

      const res = await delegateTaskAction(null, formData);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        setIsDelegating(false);
        setSubtaskTitle("");
        setSubtaskDescription("");
        setSubtaskAssigneeId("");
        setSubtaskDeadline("");
        if (onRefresh) onRefresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Subtask Summary & Delegation Trigger */}
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

        {canDelegate && !isDelegating && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDelegating(true)}
            className="text-body-sm h-8"
          >
            + Delegate Subtask
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-error-container text-on-error-container text-body-sm border border-error/20">
          {errorMsg}
        </div>
      )}

      {/* Inline Delegation Form for Heads */}
      {isDelegating && (
        <form
          onSubmit={handleDelegateSubmit}
          className="p-5 rounded bg-surface-container-lowest border border-primary/30 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
            <h4 className="font-sans font-semibold text-body-md text-on-surface">
              Delegate Child Subtask under Directive
            </h4>
            <button
              type="button"
              onClick={() => setIsDelegating(false)}
              className="text-secondary hover:text-on-surface text-sm"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-caps text-secondary font-semibold">Subtask Title *</label>
            <input
              type="text"
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="e.g. Draft sponsorship proposal PDF"
              required
              className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-caps text-secondary font-semibold">
              Scope of Work / Instructions
            </label>
            <textarea
              value={subtaskDescription}
              onChange={(e) => setSubtaskDescription(e.target.value)}
              placeholder="Provide clear deliverable expectations, links, or constraints..."
              rows={2}
              className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-label-caps text-secondary font-semibold">
                Assignee Member *
              </label>
              <select
                value={subtaskAssigneeId}
                onChange={(e) => setSubtaskAssigneeId(e.target.value)}
                required
                className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select Member...</option>
                {task.eligibleAssignees
                  ?.filter((m) => m.role === "member")
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label-caps text-secondary font-semibold">Deadline</label>
              <input
                type="date"
                value={subtaskDeadline}
                onChange={(e) => setSubtaskDeadline(e.target.value)}
                className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              >
              </input>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label-caps text-secondary font-semibold">Priority</label>
              <select
                value={subtaskPriority}
                onChange={(e) => setSubtaskPriority(e.target.value as TaskPriority)}
                className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDelegating(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
              Issue Delegated Subtask
            </Button>
          </div>
        </form>
      )}

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
              Group Heads can break directives down into specific member deliverables using the
              delegation trigger above.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
