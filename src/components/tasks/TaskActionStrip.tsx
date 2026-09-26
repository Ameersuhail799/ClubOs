"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { LabelCode } from "@/components/ui/Typography";
import {
  acceptTaskAction,
  startTaskAction,
  submitTaskForReviewAction,
  completeTaskAction,
  requestChangesAction,
  blockTaskAction,
  unblockTaskAction,
  cancelTaskAction,
  reassignTaskAction,
  updateTaskParametersAction,
} from "@/lib/tasks/actions";
import type { TaskWithFullDetails, TaskPriority } from "@/lib/tasks/types";

interface TaskActionStripProps {
  task: TaskWithFullDetails;
  onRefresh?: () => void;
}

export function TaskActionStrip({ task, onRefresh }: TaskActionStripProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal / Input dialog states
  const [activeModal, setActiveModal] = useState<
    "none" | "request_changes" | "block" | "cancel" | "reassign" | "parameters" | "whatsapp"
  >("none");

  // Form field states
  const [feedbackInput, setFeedbackInput] = useState("");
  const [blockReasonInput, setBlockReasonInput] = useState("");
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(task.assignee_id || "");
  const [selectedAssignedHeadId, setSelectedAssignedHeadId] = useState(task.assigned_head_id || "");
  const [newDeadline, setNewDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : ""
  );
  const [newPriority, setNewPriority] = useState<TaskPriority>(task.priority);

  const { canPerformActions } = task;

  const handleSimpleAction = (actionFn: () => Promise<any>) => {
    setActionError(null);
    startTransition(async () => {
      const res = await actionFn();
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleRequestChangesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const res = await requestChangesAction(task.id, feedbackInput);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setActiveModal("none");
        setFeedbackInput("");
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const res = await blockTaskAction(task.id, blockReasonInput);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setActiveModal("none");
        setBlockReasonInput("");
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const res = await cancelTaskAction(task.id, cancelReasonInput);
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setActiveModal("none");
        setCancelReasonInput("");
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const res = await reassignTaskAction(task.id, {
        assigneeId: selectedAssigneeId || null,
        assignedHeadId: selectedAssignedHeadId || null,
      });
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setActiveModal("none");
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleParametersSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const res = await updateTaskParametersAction(task.id, {
        deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
        priority: newPriority,
      });
      if (!res.success && res.error) {
        setActionError(res.error);
      } else {
        setActiveModal("none");
        if (onRefresh) onRefresh();
      }
    });
  };

  // WhatsApp safe handoff summary generator
  const getWhatsAppSummary = () => {
    const lines = [
      `*CLUBOS TASK HANDOFF*`,
      `*Task Code:* ${task.task_code}`,
      `*Title:* ${task.title}`,
      `*Status:* ${task.status.toUpperCase()}`,
      `*Priority:* ${task.priority.toUpperCase()}`,
      task.deadline ? `*Deadline:* ${new Date(task.deadline).toLocaleDateString()}` : null,
      task.primaryGroup ? `*Group:* ${task.primaryGroup.name}` : null,
      `*Link:* ${typeof window !== "undefined" ? window.location.href : ""}`,
    ].filter(Boolean);
    return encodeURIComponent(lines.join("\n"));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Action Bar */}
      <div className="p-4 rounded-md bg-surface-container-lowest border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LabelCode size="sm" className="text-secondary font-bold uppercase tracking-wider">
            ROLE: {task.currentUserRole.replace("_", " ").toUpperCase()}
          </LabelCode>
          <span className="text-outline-variant">•</span>
          <span className="text-body-sm text-secondary">
            {task.status === "completed"
              ? "Directive completed. Lifecycle locked."
              : task.status === "cancelled"
              ? "Directive cancelled. Lifecycle closed."
              : "Permitted operational transitions"}
          </span>
        </div>

        {/* Action Buttons Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Head / Group Head: Accept */}
          {canPerformActions.canAccept && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={() => handleSimpleAction(() => acceptTaskAction(task.id))}
            >
              Accept Directive
            </Button>
          )}

          {/* Member / Group Head: Start Work */}
          {canPerformActions.canStart && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={() => handleSimpleAction(() => startTaskAction(task.id))}
            >
              Start Work
            </Button>
          )}

          {/* Member / Group Head: Submit for Review */}
          {canPerformActions.canSubmitForReview && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={() => handleSimpleAction(() => submitTaskForReviewAction(task.id))}
            >
              Submit for Review
            </Button>
          )}

          {/* Group Head / Main Head: Approve & Complete */}
          {canPerformActions.canComplete && task.status === "ready_for_review" && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={() => handleSimpleAction(() => completeTaskAction(task.id))}
              className="bg-primary hover:bg-primary-container"
            >
              Approve & Complete
            </Button>
          )}

          {/* Group Head / Main Head: Request Changes */}
          {canPerformActions.canRequestChanges && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setActiveModal("request_changes")}
            >
              Request Changes
            </Button>
          )}

          {/* Resolve Blocker */}
          {canPerformActions.canUnblock && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={() => handleSimpleAction(() => unblockTaskAction(task.id))}
            >
              Resolve & Resume
            </Button>
          )}

          {/* Report Block */}
          {canPerformActions.canBlock && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setActiveModal("block")}
              className="text-error border-error/20 hover:bg-error-container hover:text-on-error-container"
            >
              Report Block
            </Button>
          )}

          {/* Reassign (Heads only) */}
          {canPerformActions.canReassign && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => setActiveModal("reassign")}
            >
              Reassign
            </Button>
          )}

          {/* Update Parameters (Heads only) */}
          {canPerformActions.canUpdateParameters && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => setActiveModal("parameters")}
            >
              Edit Parameters
            </Button>
          )}

          {/* Cancel Directive (Heads only) */}
          {canPerformActions.canCancel && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setActiveModal("cancel")}
              className="text-secondary hover:text-error"
            >
              Cancel
            </Button>
          )}

          {/* Safe WhatsApp Clarification */}
          <a
            href={`https://wa.me/?text=${getWhatsAppSummary()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center font-sans font-medium h-7 px-2.5 text-body-sm rounded border border-outline-variant bg-surface-container text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Safe WhatsApp task handoff with zero credentials"
          >
            WhatsApp Handoff
          </a>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 rounded bg-error-container border border-error/20 text-on-error-container text-body-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="font-bold text-xs hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* MODAL 1: Request Changes Modal */}
      {activeModal === "request_changes" && (
        <div className="p-4 rounded-md bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-sans font-semibold text-body-md text-on-surface">
              Request Changes on Submitted Work
            </h4>
            <button
              type="button"
              onClick={() => setActiveModal("none")}
              className="text-secondary hover:text-on-surface"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleRequestChangesSubmit} className="flex flex-col gap-3">
            <textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              placeholder="Explain the required revisions, missing deliverables, or fixes..."
              rows={3}
              required
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal("none")}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
                Send Revision Notice
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Report Block Modal */}
      {activeModal === "block" && (
        <div className="p-4 rounded-md bg-surface-container-lowest border border-error/30 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-sans font-semibold text-body-md text-error">
              Report Task Impediment / Blocker
            </h4>
            <button
              type="button"
              onClick={() => setActiveModal("none")}
              className="text-secondary hover:text-on-surface"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleBlockSubmit} className="flex flex-col gap-3">
            <textarea
              value={blockReasonInput}
              onChange={(e) => setBlockReasonInput(e.target.value)}
              placeholder="Describe the blocker or bottleneck preventing progress..."
              rows={3}
              required
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal("none")}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="sm" isLoading={isPending}>
                Flag as Blocked
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Cancel Task Modal */}
      {activeModal === "cancel" && (
        <div className="p-4 rounded-md bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-sans font-semibold text-body-md text-on-surface">
              Cancel Task Directive
            </h4>
            <button
              type="button"
              onClick={() => setActiveModal("none")}
              className="text-secondary hover:text-on-surface"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleCancelSubmit} className="flex flex-col gap-3">
            <p className="text-body-sm text-secondary">
              Cancelling a directive is permanent and terminates further execution.
            </p>
            <input
              type="text"
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder="Reason for cancellation (optional)..."
              className="w-full p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal("none")}
                disabled={isPending}
              >
                Go Back
              </Button>
              <Button type="submit" variant="danger" size="sm" isLoading={isPending}>
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: Reassign Modal */}
      {activeModal === "reassign" && (
        <div className="p-4 rounded-md bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-sans font-semibold text-body-md text-on-surface">
              Reassign Task Ownership
            </h4>
            <button
              type="button"
              onClick={() => setActiveModal("none")}
              className="text-secondary hover:text-on-surface"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleReassignSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-label-caps text-secondary font-semibold">
                Target Assignee / Executor
              </label>
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              >
                <option value="">Unassigned (Open Pool)</option>
                {task.eligibleAssignees?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName} ({m.role.toUpperCase()} • {m.primaryGroupName || "General"})
                  </option>
                ))}
              </select>
            </div>

            {task.currentUserRole === "main_head" && (
              <div className="flex flex-col gap-1">
                <label className="text-label-caps text-secondary font-semibold">
                  Responsible Group Head (Main Head Only)
                </label>
                <select
                  value={selectedAssignedHeadId}
                  onChange={(e) => setSelectedAssignedHeadId(e.target.value)}
                  className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Unassigned Head</option>
                  {task.eligibleAssignees
                    ?.filter((m) => m.role === "group_head" || m.role === "main_head")
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.fullName} ({m.primaryGroupName || "Main Head"})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal("none")}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
                Update Assignment
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: Update Parameters Modal */}
      {activeModal === "parameters" && (
        <div className="p-4 rounded-md bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-sans font-semibold text-body-md text-on-surface">
              Update Deadline & Priority
            </h4>
            <button
              type="button"
              onClick={() => setActiveModal("none")}
              className="text-secondary hover:text-on-surface"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleParametersSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-caps text-secondary font-semibold">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-caps text-secondary font-semibold">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal("none")}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
