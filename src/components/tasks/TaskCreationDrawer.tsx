"use client";

import React, { useState, useTransition, useId } from "react";
import Link from "next/link";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { createTaskAction } from "@/lib/tasks/actions";
import type { TaskRow, TaskPriority, EligibleGroupHead } from "@/lib/tasks/types";

interface GroupOption {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface TaskCreationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupOption[];
  groupHeads: EligibleGroupHead[];
  onTaskCreated?: (newTask: TaskRow) => void;
}

export function TaskCreationDrawer({
  isOpen,
  onClose,
  groups,
  groupHeads,
  onTaskCreated,
}: TaskCreationDrawerProps) {
  const [isPending, startTransition] = useTransition();

  // Form states
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedHeadId, setSelectedHeadId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdTask, setCreatedTask] = useState<TaskRow | null>(null);

  // Client submission token for double-submission protection
  const submissionToken = useId();

  if (!isOpen) return null;

  // Filter group heads by currently selected primary group
  const eligibleHeadsForGroup = groupHeads.filter(
    (gh) => gh.primaryGroupId === selectedGroupId
  );

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const selectedHead = groupHeads.find((gh) => gh.userId === selectedHeadId);

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroupId = e.target.value;
    setSelectedGroupId(newGroupId);
    setErrorMsg(null);

    // Clear head selection if current head doesn't belong to newly selected group
    const headsForNewGroup = groupHeads.filter((gh) => gh.primaryGroupId === newGroupId);
    if (!headsForNewGroup.some((gh) => gh.userId === selectedHeadId)) {
      if (headsForNewGroup.length === 1) {
        // Ergonomic auto-select if exactly 1 Group Head assigned
        setSelectedHeadId(headsForNewGroup[0].userId);
      } else {
        setSelectedHeadId("");
      }
    }
  };

  const handleResetForm = () => {
    setSelectedGroupId("");
    setSelectedHeadId("");
    setTitle("");
    setDescription("");
    setDeadline("");
    setPriority("medium");
    setErrorMsg(null);
    setCreatedTask(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    // Client-side validation
    if (!title.trim() || title.trim().length < 2) {
      setErrorMsg("Task title is required (at least 2 characters).");
      return;
    }
    if (!selectedGroupId) {
      setErrorMsg("Please select a target functional group.");
      return;
    }
    if (!selectedHeadId) {
      setErrorMsg("Please select a responsible Group Head for this directive.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title.trim());
      if (description.trim()) formData.set("description", description.trim());
      formData.set("primaryGroupId", selectedGroupId);
      formData.set("assignedHeadId", selectedHeadId);
      if (deadline) formData.set("deadline", new Date(deadline).toISOString());
      formData.set("priority", priority);
      formData.set("clientSubmissionId", `${submissionToken}-${Date.now()}`);

      const res = await createTaskAction(null, formData);

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to create directive. Please verify inputs.");
      } else {
        setCreatedTask(res.data);
        if (onTaskCreated) {
          onTaskCreated(res.data);
        }
      }
    });
  };

  const canSubmit =
    title.trim().length >= 2 &&
    Boolean(selectedGroupId) &&
    Boolean(selectedHeadId) &&
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
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4 bg-surface-container-lowest">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Executive Directive Dispatch</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">
                TOP-LEVEL
              </StatusBadge>
            </div>
            <h3 className="font-sans font-bold text-headline-sm text-on-surface">
              Create Task Directive
            </h3>
            <p className="font-sans text-body-sm text-secondary">
              Assign an institutional directive to a responsible Group Head for execution.
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

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* SUCCESS STATE */}
          {createdTask ? (
            <div className="flex flex-col gap-6 py-4">
              <div className="p-5 rounded bg-surface-container-low border border-primary/30 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="success" size="sm">
                      DIRECTIVE DISPATCHED
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
                    <span className="text-label-code-sm text-secondary block">Division</span>
                    <strong className="text-on-surface">{selectedGroup?.name}</strong>
                  </div>
                  <div>
                    <span className="text-label-code-sm text-secondary block">
                      Responsible Head
                    </span>
                    <strong className="text-on-surface">
                      {selectedHead?.fullName || "Assigned Head"}
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

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-body-sm"
                    onClick={handleResetForm}
                  >
                    + Create Another Directive
                  </Button>
                  <Button variant="ghost" className="text-body-sm" onClick={onClose}>
                    Done / Close
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <form id="create-task-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3.5 rounded bg-error-container text-on-error-container text-body-sm border border-error/20 flex items-start gap-2">
                  <span className="font-bold select-none">!</span>
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              {/* 1. Target Division & Group Head Assignment */}
              <div className="p-4 rounded bg-surface-container-low border border-outline-variant flex flex-col gap-4">
                <LabelCaps className="text-secondary font-semibold">
                  Organizational Target & Responsibility
                </LabelCaps>

                {/* Primary Group Selector */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="task-primary-group"
                    className="text-label-caps text-on-surface font-semibold"
                  >
                    Target Functional Group *
                  </label>
                  <select
                    id="task-primary-group"
                    value={selectedGroupId}
                    onChange={handleGroupChange}
                    required
                    disabled={isPending}
                    className="p-2.5 rounded border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Target Functional Group...</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Responsible Group Head Selector */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="task-group-head"
                    className="text-label-caps text-on-surface font-semibold"
                  >
                    Responsible Group Head *
                  </label>
                  <select
                    id="task-group-head"
                    value={selectedHeadId}
                    onChange={(e) => {
                      setSelectedHeadId(e.target.value);
                      setErrorMsg(null);
                    }}
                    required
                    disabled={isPending || !selectedGroupId || eligibleHeadsForGroup.length === 0}
                    className="p-2.5 rounded border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    {!selectedGroupId ? (
                      <option value="">First select a target functional group above...</option>
                    ) : eligibleHeadsForGroup.length === 0 ? (
                      <option value="">No active Group Head available</option>
                    ) : (
                      <>
                        <option value="">Select Responsible Group Head...</option>
                        {eligibleHeadsForGroup.map((gh) => (
                          <option key={gh.userId} value={gh.userId}>
                            {gh.fullName} ({gh.email})
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  {/* Warning if group has no active Group Head */}
                  {selectedGroupId && eligibleHeadsForGroup.length === 0 && (
                    <div className="p-2.5 rounded bg-warning-container text-on-warning-container text-body-sm border border-warning/30 flex items-start gap-2">
                      <span className="font-bold select-none">⚠</span>
                      <span>
                        No active Group Head is assigned to{" "}
                        <strong>{selectedGroup?.name}</strong>. Please assign a Group Head in
                        Member Management before dispatching directives to this division.
                      </span>
                    </div>
                  )}

                  {/* Responsibility Card if selected */}
                  {selectedHead && (
                    <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant flex items-center justify-between text-body-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">
                          {selectedHead.fullName}
                        </span>
                        <span className="text-secondary text-xs">{selectedHead.email}</span>
                      </div>
                      <StatusBadge variant="group" size="sm">
                        HEAD OF {selectedGroup?.name?.toUpperCase()}
                      </StatusBadge>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Directive Parameters */}
              <div className="flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="task-title"
                    className="text-label-caps text-on-surface font-semibold"
                  >
                    Directive Title *
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="e.g. Annual Tech Symposium Logistics & Keynote Coordination"
                    required
                    disabled={isPending}
                    maxLength={255}
                    className="p-2.5 rounded border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="task-description"
                    className="text-label-caps text-secondary font-semibold"
                  >
                    Scope of Work / Instructions (Optional)
                  </label>
                  <textarea
                    id="task-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Define operational expectations, deliverable milestones, budget constraints, or external partners..."
                    rows={4}
                    disabled={isPending}
                    maxLength={5000}
                    className="p-2.5 rounded border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
                  />
                </div>

                {/* Two-Column Grid: Deadline & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="task-deadline"
                      className="text-label-caps text-secondary font-semibold"
                    >
                      Target Deadline
                    </label>
                    <input
                      id="task-deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      disabled={isPending}
                      className="p-2.5 rounded border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="task-priority"
                      className="text-label-caps text-secondary font-semibold"
                    >
                      Priority Level
                    </label>
                    <select
                      id="task-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      disabled={isPending}
                      className="p-2.5 rounded border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent Priority</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {!createdTask && (
          <div className="p-4 sm:px-6 sm:py-4 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-task-form"
              variant="primary"
              size="sm"
              isLoading={isPending}
              disabled={!canSubmit}
            >
              Issue Directive
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
