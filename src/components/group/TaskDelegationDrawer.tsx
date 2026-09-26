"use client";

import React, { useState, useTransition, useId, useEffect } from "react";
import Link from "next/link";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { delegateTaskAction } from "@/lib/tasks/actions";
import type {
  TaskRow,
  TaskPriority,
  TaskWithDetails,
  GroupMemberWorkload,
} from "@/lib/tasks/types";

interface TaskDelegationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentTasks: TaskWithDetails[];
  preselectedParentTaskId?: string;
  members: GroupMemberWorkload[];
  onSubtaskDelegated?: (newTask: TaskRow) => void;
}

export function TaskDelegationDrawer({
  isOpen,
  onClose,
  parentTasks,
  preselectedParentTaskId,
  members,
  onSubtaskDelegated,
}: TaskDelegationDrawerProps) {
  const [isPending, startTransition] = useTransition();

  // Form states
  const [selectedParentId, setSelectedParentId] = useState(preselectedParentTaskId || "");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdTask, setCreatedTask] = useState<TaskRow | null>(null);

  // Client submission token for double-submission protection
  const submissionToken = useId();

  // Synchronize preselectedParentTaskId when opened
  useEffect(() => {
    if (isOpen) {
      if (preselectedParentTaskId) {
        setSelectedParentId(preselectedParentTaskId);
        const parent = parentTasks.find((t) => t.id === preselectedParentTaskId);
        if (parent) {
          setPriority(parent.priority);
        }
      } else if (parentTasks.length === 1) {
        setSelectedParentId(parentTasks[0].id);
        setPriority(parentTasks[0].priority);
      }
      setErrorMsg(null);
      setCreatedTask(null);
    }
  }, [isOpen, preselectedParentTaskId, parentTasks]);

  if (!isOpen) return null;

  const selectedParent = parentTasks.find((t) => t.id === selectedParentId);
  const selectedMember = members.find((m) => m.userId === selectedAssigneeId);

  // Check if chosen deadline exceeds parent deadline
  const isDeadlinePastParent = Boolean(
    deadline &&
      selectedParent?.deadline &&
      new Date(deadline).getTime() > new Date(selectedParent.deadline).getTime()
  );

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parentId = e.target.value;
    setSelectedParentId(parentId);
    setErrorMsg(null);
    const parent = parentTasks.find((t) => t.id === parentId);
    if (parent) {
      setPriority(parent.priority);
    }
  };

  const handleResetForm = () => {
    if (preselectedParentTaskId) {
      setSelectedParentId(preselectedParentTaskId);
    } else {
      setSelectedParentId(parentTasks.length === 1 ? parentTasks[0].id : "");
    }
    setSelectedAssigneeId("");
    setTitle("");
    setDescription("");
    setDeadline("");
    setPriority(selectedParent?.priority || "medium");
    setErrorMsg(null);
    setCreatedTask(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    if (!selectedParentId) {
      setErrorMsg("Please select a parent directive to delegate under.");
      return;
    }
    if (!title.trim() || title.trim().length < 2) {
      setErrorMsg("Subtask title is required (minimum 2 characters).");
      return;
    }
    if (!selectedAssigneeId) {
      setErrorMsg("Please select an active group member to assign.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("parentTaskId", selectedParentId);
      formData.set("title", title.trim());
      if (description.trim()) formData.set("description", description.trim());
      formData.set("assigneeId", selectedAssigneeId);
      if (deadline) formData.set("deadline", new Date(deadline).toISOString());
      formData.set("priority", priority);
      formData.set("clientSubmissionId", `${submissionToken}-${Date.now()}`);

      const res = await delegateTaskAction(null, formData);

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to delegate subtask. Please check inputs.");
      } else {
        setCreatedTask(res.data);
        if (onSubtaskDelegated) {
          onSubtaskDelegated(res.data);
        }
      }
    });
  };

  const canSubmit =
    Boolean(selectedParentId) &&
    title.trim().length >= 2 &&
    Boolean(selectedAssigneeId) &&
    !isPending;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={() => {
          if (!isPending) onClose();
        }}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-50 w-full sm:max-w-xl bg-surface-container-lowest border-l border-outline-variant shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4 bg-surface-container-lowest">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Group Head Delegation</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">
                SUBTASK
              </StatusBadge>
            </div>
            <h3 className="font-sans font-bold text-headline-sm text-on-surface">
              Delegate Subtask
            </h3>
            <p className="font-sans text-body-sm text-secondary">
              Decompose a parent directive and assign action items to active group members.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* SUCCESS STATE */}
          {createdTask ? (
            <div className="flex flex-col gap-6 py-4">
              <div className="p-5 rounded bg-surface-container-low border border-primary/30 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="success" size="sm">
                      SUBTASK DELEGATED
                    </StatusBadge>
                    <LabelCode size="sm" className="text-primary font-bold">
                      {createdTask.task_code}
                    </LabelCode>
                  </div>
                  <StatusBadge variant="pending" size="sm">
                    {createdTask.status.toUpperCase()}
                  </StatusBadge>
                </div>

                <div className="flex flex-col gap-1">
                  <h4 className="font-sans font-bold text-body-lg text-on-surface">
                    {createdTask.title}
                  </h4>
                  {createdTask.description && (
                    <p className="font-sans text-body-sm text-secondary line-clamp-2">
                      {createdTask.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant text-body-sm">
                  <div>
                    <span className="text-label-code-sm text-secondary block">
                      Parent Directive
                    </span>
                    <strong className="text-on-surface truncate block">
                      {selectedParent?.title || "Directive"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-label-code-sm text-secondary block">
                      Assigned Member
                    </span>
                    <strong className="text-on-surface">
                      {selectedMember?.fullName || "Member"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-label-code-sm text-secondary block">Priority</span>
                    <span className="uppercase font-mono text-label-code-sm text-on-surface">
                      {createdTask.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-label-code-sm text-secondary block">Deadline</span>
                    <span className="text-on-surface">
                      {createdTask.deadline
                        ? new Date(createdTask.deadline).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Open (None)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={`/workspace/tasks/${createdTask.id}`}
                  className="w-full inline-flex items-center justify-center font-sans font-semibold text-body-md h-10 px-4 rounded bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                >
                  Open in Task Inspector →
                </Link>

                <Button
                  variant="outline"
                  onClick={handleResetForm}
                  className="w-full"
                >
                  + Delegate Another Subtask
                </Button>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errorMsg && (
                <div className="p-3 rounded bg-error/10 border border-error/30 text-error text-body-sm flex items-start gap-2">
                  <span className="font-bold">⚠</span>
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              {/* 1. Parent Directive Selector */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="parentTaskId"
                  className="font-sans text-label-code-md text-on-surface font-semibold flex items-center justify-between"
                >
                  <span>Parent Directive *</span>
                  <span className="text-label-code-sm text-secondary font-normal">
                    {parentTasks.length} available
                  </span>
                </label>
                <select
                  id="parentTaskId"
                  value={selectedParentId}
                  onChange={handleParentChange}
                  disabled={isPending || Boolean(preselectedParentTaskId)}
                  required
                  className="w-full h-10 px-3 rounded bg-surface-container border border-outline font-sans text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                >
                  <option value="">— Select Parent Directive —</option>
                  {parentTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.task_code}] {t.title} ({t.status})
                    </option>
                  ))}
                </select>

                {selectedParent && (
                  <div className="mt-1 p-2.5 rounded bg-surface-container-low border border-outline-variant text-label-code-sm flex items-center justify-between">
                    <span className="text-secondary truncate mr-2">
                      Directive Status: <strong>{selectedParent.status.toUpperCase()}</strong>
                    </span>
                    <span className="text-secondary whitespace-nowrap">
                      Deadline:{" "}
                      <strong>
                        {selectedParent.deadline
                          ? new Date(selectedParent.deadline).toLocaleDateString()
                          : "None"}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Target Group Member */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="assigneeId"
                  className="font-sans text-label-code-md text-on-surface font-semibold flex items-center justify-between"
                >
                  <span>Assign To Member *</span>
                  <span className="text-label-code-sm text-secondary font-normal">
                    {members.length} members in group
                  </span>
                </label>
                <select
                  id="assigneeId"
                  value={selectedAssigneeId}
                  onChange={(e) => {
                    setSelectedAssigneeId(e.target.value);
                    setErrorMsg(null);
                  }}
                  disabled={isPending}
                  required
                  className="w-full h-10 px-3 rounded bg-surface-container border border-outline font-sans text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                >
                  <option value="">— Select Active Group Member —</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName} ({m.email}) — [{m.availability}: {m.activeTaskCount} active]
                    </option>
                  ))}
                </select>

                {/* Member Workload Badge / Note */}
                {selectedMember && (
                  <div className="mt-1 flex items-center justify-between p-2 rounded bg-surface-container-low border border-outline-variant text-label-code-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-secondary">Workload:</span>
                      <StatusBadge
                        variant={
                          selectedMember.availability === "Available"
                            ? "success"
                            : selectedMember.availability === "Moderate"
                            ? "neutral"
                            : "error"
                        }
                        size="sm"
                      >
                        {selectedMember.availability.toUpperCase()} ({selectedMember.activeTaskCount} active)
                      </StatusBadge>
                    </div>
                    {selectedMember.availability === "Busy" && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Heavy workload
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Subtask Title */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="title"
                  className="font-sans text-label-code-md text-on-surface font-semibold"
                >
                  Subtask Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design promotional banner or audit venue seating"
                  disabled={isPending}
                  required
                  className="w-full h-10 px-3 rounded bg-surface-container border border-outline font-sans text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>

              {/* 4. Description / Scope */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="description"
                  className="font-sans text-label-code-md text-on-surface font-semibold flex items-center justify-between"
                >
                  <span>Scope & Instructions</span>
                  <span className="text-label-code-sm text-secondary font-normal">Optional</span>
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify clear deliverables, acceptance criteria, or operational steps..."
                  disabled={isPending}
                  className="w-full p-3 rounded bg-surface-container border border-outline font-sans text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary resize-y disabled:opacity-60"
                />
              </div>

              {/* 5. Priority & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="priority"
                    className="font-sans text-label-code-md text-on-surface font-semibold"
                  >
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    disabled={isPending}
                    className="w-full h-10 px-3 rounded bg-surface-container border border-outline font-sans text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="deadline"
                    className="font-sans text-label-code-md text-on-surface font-semibold flex items-center justify-between"
                  >
                    <span>Target Deadline</span>
                    <span className="text-label-code-sm text-secondary font-normal">Optional</span>
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    disabled={isPending}
                    className="w-full h-10 px-3 rounded bg-surface-container border border-outline font-sans text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Deadline warning if past parent deadline */}
              {isDeadlinePastParent && (
                <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-label-code-sm">
                  ⚠ Subtask deadline exceeds parent directive deadline (
                  {new Date(selectedParent!.deadline!).toLocaleDateString()}).
                </div>
              )}

              {/* Actions Footer inside form */}
              <div className="pt-4 border-t border-outline-variant flex items-center justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSubmit}
                >
                  {isPending ? "Delegating Subtask..." : "Delegate Subtask"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
