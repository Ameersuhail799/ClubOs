"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { TaskDelegationDrawer } from "./TaskDelegationDrawer";
import {
  acceptTaskAction,
  startTaskAction,
  completeTaskAction,
  requestChangesAction,
  unblockTaskAction,
} from "@/lib/tasks/actions";
import type {
  GroupWorkspaceData,
  TaskWithDetails,
  TaskStatus,
  TaskRow,
  TaskResult,
} from "@/lib/tasks/types";

type InboxTab =
  | "all"
  | "needs_action"
  | "assigned"
  | "in_progress"
  | "ready_for_review"
  | "completed";

interface GroupWorkspaceContentProps {
  initialData: GroupWorkspaceData;
}

export function GroupWorkspaceContent({ initialData }: GroupWorkspaceContentProps) {
  const router = useRouter();
  const [data, setData] = useState<GroupWorkspaceData>(initialData);
  const [isPending, startTransition] = useTransition();

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "directives" | "subtasks">("all");

  // Delegation Drawer
  const [isDelegationOpen, setIsDelegationOpen] = useState(false);
  const [delegationParentId, setDelegationParentId] = useState<string | undefined>(undefined);

  // Quick Action Pending & Feedback States
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackTask, setFeedbackTask] = useState<TaskWithDetails | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");

  const { group, tasks, parentDirectives, subtasks, members, needsActionCount, currentUserRole } =
    data;

  // Counts for tabs
  const assignedCount = tasks.filter((t) => t.status === "assigned").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "accepted"
  ).length;
  const reviewCount = tasks.filter((t) => t.status === "ready_for_review").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const handleQuickAction = (
    taskId: string,
    actionFn: (id: string) => Promise<TaskResult<TaskRow>>
  ) => {
    setActionTaskId(taskId);
    setActionError(null);

    startTransition(async () => {
      const res = await actionFn(taskId);
      if (!res.success) {
        setActionError(res.error || "Action failed.");
      } else {
        router.refresh();
      }
      setActionTaskId(null);
    });
  };

  const handleRequestChangesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTask) return;

    setActionTaskId(feedbackTask.id);
    setActionError(null);

    startTransition(async () => {
      const res = await requestChangesAction(feedbackTask.id, feedbackNotes.trim() || undefined);
      if (!res.success) {
        setActionError(res.error || "Failed to request changes.");
      } else {
        setFeedbackTask(null);
        setFeedbackNotes("");
        router.refresh();
      }
      setActionTaskId(null);
    });
  };

  // Open delegation drawer
  const openDelegationDrawer = (parentId?: string) => {
    setDelegationParentId(parentId);
    setIsDelegationOpen(true);
  };

  // Needs Action items
  const needsActionTasks = tasks.filter(
    (t) =>
      t.status === "assigned" ||
      t.status === "ready_for_review" ||
      t.status === "blocked"
  );

  // Filter tasks based on search, tab, and type
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchCode = task.task_code.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchDesc) return false;
    }

    // Type filter
    if (typeFilter === "directives" && task.parent_task_id !== null) return false;
    if (typeFilter === "subtasks" && task.parent_task_id === null) return false;

    // Tab filter
    if (activeTab === "needs_action") {
      return (
        task.status === "assigned" ||
        task.status === "ready_for_review" ||
        task.status === "blocked"
      );
    }
    if (activeTab === "assigned") return task.status === "assigned";
    if (activeTab === "in_progress") {
      return task.status === "in_progress" || task.status === "accepted";
    }
    if (activeTab === "ready_for_review") return task.status === "ready_for_review";
    if (activeTab === "completed") return task.status === "completed";

    return true;
  });

  // Group filtered tasks into directives and subtasks
  const filteredDirectives = filteredTasks.filter((t) => t.parent_task_id === null);
  const standaloneSubtasks = filteredTasks.filter((t) => {
    if (t.parent_task_id === null) return false;
    // If its parent is already shown in filteredDirectives, we don't duplicate it as standalone
    if (activeTab === "all" && typeFilter === "all" && !searchQuery.trim()) {
      return false; // Handled under parent tree
    }
    return true;
  });

  const getStatusBadgeVariant = (status: TaskStatus) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 bg-red-500/10 border-red-500/20";
      case "high":
        return "text-amber-600 bg-amber-500/10 border-amber-500/20";
      case "medium":
        return "text-blue-600 bg-blue-500/10 border-blue-500/20";
      default:
        return "text-secondary bg-surface-container border-outline-variant";
    }
  };

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Scope & Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">{group.name} Operations</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">
                {currentUserRole === "main_head" ? "MAIN HEAD PREVIEW" : "GROUP HEAD SCOPE"}
              </StatusBadge>
            </div>
            <HeadlineMd>{group.name} Workspace</HeadlineMd>
            <BodyMd className="text-secondary">
              {group.description || "Division directive tracking, subtask delegation, and member workload oversight."}
            </BodyMd>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => openDelegationDrawer()}
              disabled={parentDirectives.length === 0}
            >
              + Delegate Subtask
            </Button>
          </div>
        </div>

        {/* Global Error Notice */}
        {actionError && (
          <div className="p-4 rounded bg-error/10 border border-error/30 text-error text-body-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">⚠</span>
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-error hover:underline text-label-code-sm uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* HIGH-PRIORITY "NEEDS ACTION" SECTION */}
        {needsActionTasks.length > 0 && (
          <div className="p-5 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LabelCaps className="text-primary font-bold">Needs Action</LabelCaps>
                <span className="px-2 py-0.5 rounded-full text-label-code-sm font-mono font-bold bg-primary/10 text-primary">
                  {needsActionTasks.length} pending items
                </span>
              </div>
              <span className="text-label-code-sm text-secondary">
                Directives & Subtasks requiring immediate operational decisions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {needsActionTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <LabelCode size="sm" className="text-primary font-bold">
                        {t.task_code}
                      </LabelCode>
                      <StatusBadge variant={getStatusBadgeVariant(t.status)} size="sm">
                        {t.status.toUpperCase()}
                      </StatusBadge>
                    </div>

                    <Link
                      href={`/workspace/tasks/${t.id}`}
                      className="font-sans font-semibold text-body-md text-on-surface hover:text-primary transition-colors line-clamp-1"
                    >
                      {t.title}
                    </Link>

                    <div className="text-body-sm text-secondary line-clamp-2">
                      {t.description || "No description provided."}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-label-code-sm text-secondary">
                      <span>{t.parent_task_id ? "Subtask" : "Directive"}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                      {t.deadline && (
                        <>
                          <span>•</span>
                          <span>Due {new Date(t.deadline).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2">
                    {t.status === "assigned" && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        disabled={actionTaskId === t.id}
                        onClick={() => handleQuickAction(t.id, acceptTaskAction)}
                      >
                        {actionTaskId === t.id ? "Accepting..." : "Accept Directive"}
                      </Button>
                    )}

                    {t.status === "ready_for_review" && (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          disabled={actionTaskId === t.id}
                          onClick={() => handleQuickAction(t.id, completeTaskAction)}
                        >
                          {actionTaskId === t.id ? "Approving..." : "Approve & Complete"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionTaskId === t.id}
                          onClick={() => setFeedbackTask(t)}
                        >
                          Request Changes
                        </Button>
                      </div>
                    )}

                    {t.status === "blocked" && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        disabled={actionTaskId === t.id}
                        onClick={() => handleQuickAction(t.id, unblockTaskAction)}
                      >
                        {actionTaskId === t.id ? "Resolving..." : "Resolve Blocker"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKSPACE MAIN LAYOUT: Task Board / Inbox + Team Workload Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT 3 COLUMNS: Task Inbox, Hierarchy Tree & Tabs */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Filters Bar */}
            <div className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Inbox Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === "all"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("needs_action")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === "needs_action"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Needs Action ({needsActionCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("assigned")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === "assigned"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Assigned ({assignedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("in_progress")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === "in_progress"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  In Progress ({inProgressCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ready_for_review")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === "ready_for_review"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Review ({reviewCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("completed")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === "completed"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Completed ({completedCount})
                </button>
              </div>

              {/* Search & Type filter */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 px-3 rounded bg-surface-container border border-outline font-sans text-label-code-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-48"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="h-8 px-2 rounded bg-surface-container border border-outline font-sans text-label-code-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Types</option>
                  <option value="directives">Directives</option>
                  <option value="subtasks">Subtasks</option>
                </select>
              </div>
            </div>

            {/* Task Hierarchy List */}
            {filteredTasks.length === 0 ? (
              <div className="p-8 rounded bg-surface-container-lowest border border-outline-variant text-center flex flex-col items-center justify-center gap-2">
                <LabelCode size="sm" className="text-secondary">
                  NO TASKS FOUND
                </LabelCode>
                <BodyMd className="text-secondary max-w-sm">
                  {searchQuery.trim()
                    ? `No tasks matching "${searchQuery}".`
                    : "No tasks found under this filter."}
                </BodyMd>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* 1. Parent Directives and their delegated subtask trees */}
                {filteredDirectives.map((directive) => {
                  const childSubtasks = subtasks.filter(
                    (s) => s.parent_task_id === directive.id
                  );

                  return (
                    <div
                      key={directive.id}
                      className="rounded bg-surface-container-lowest border border-outline-variant overflow-hidden"
                    >
                      {/* Directive Row */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2">
                            <StatusBadge variant="active" size="sm">
                              DIRECTIVE
                            </StatusBadge>
                            <LabelCode size="sm" className="text-primary font-bold">
                              {directive.task_code}
                            </LabelCode>
                            <StatusBadge
                              variant={getStatusBadgeVariant(directive.status)}
                              size="sm"
                            >
                              {directive.status.toUpperCase()}
                            </StatusBadge>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${getPriorityColor(
                                directive.priority
                              )}`}
                            >
                              {directive.priority}
                            </span>
                          </div>

                          <Link
                            href={`/workspace/tasks/${directive.id}`}
                            className="font-sans font-bold text-body-md text-on-surface hover:text-primary transition-colors"
                          >
                            {directive.title}
                          </Link>

                          {directive.description && (
                            <p className="font-sans text-body-sm text-secondary line-clamp-1">
                              {directive.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-label-code-sm text-secondary mt-1">
                            <span>
                              Deadline:{" "}
                              {directive.deadline
                                ? new Date(directive.deadline).toLocaleDateString()
                                : "Open"}
                            </span>
                            <span>•</span>
                            <span>{childSubtasks.length} delegated subtasks</span>
                          </div>
                        </div>

                        {/* Directive Action Buttons */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {directive.status === "assigned" && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionTaskId === directive.id}
                              onClick={() =>
                                handleQuickAction(directive.id, acceptTaskAction)
                              }
                            >
                              {actionTaskId === directive.id ? "Accepting..." : "Accept"}
                            </Button>
                          )}

                          {directive.status === "accepted" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionTaskId === directive.id}
                              onClick={() =>
                                handleQuickAction(directive.id, startTaskAction)
                              }
                            >
                              {actionTaskId === directive.id ? "Starting..." : "Start Directive"}
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openDelegationDrawer(directive.id)}
                          >
                            + Delegate
                          </Button>

                          <Link href={`/workspace/tasks/${directive.id}`}>
                            <Button variant="outline" size="sm">
                              Inspect →
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Delegated Subtasks Tree */}
                      {childSubtasks.length > 0 && (
                        <div className="border-t border-outline-variant bg-surface-container-low/50 divide-y divide-outline-variant/60">
                          {childSubtasks.map((subtask) => {
                            const assignee = members.find(
                              (m) => m.userId === subtask.assignee_id
                            );

                            return (
                              <div
                                key={subtask.id}
                                className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low transition-colors ml-4 sm:ml-6 border-l-2 border-primary/40"
                              >
                                <div className="flex flex-col gap-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-primary font-bold text-label-code-sm">
                                      ↳
                                    </span>
                                    <LabelCode size="sm" className="text-secondary font-bold">
                                      {subtask.task_code}
                                    </LabelCode>
                                    <StatusBadge
                                      variant={getStatusBadgeVariant(subtask.status)}
                                      size="sm"
                                    >
                                      {subtask.status.toUpperCase()}
                                    </StatusBadge>
                                    <span
                                      className={`px-1 py-0.5 rounded text-[10px] font-mono uppercase border ${getPriorityColor(
                                        subtask.priority
                                      )}`}
                                    >
                                      {subtask.priority}
                                    </span>
                                  </div>

                                  <Link
                                    href={`/workspace/tasks/${subtask.id}`}
                                    className="font-sans font-semibold text-body-sm text-on-surface hover:text-primary transition-colors"
                                  >
                                    {subtask.title}
                                  </Link>

                                  <div className="flex items-center gap-3 text-label-code-sm text-secondary">
                                    <span>
                                      Assignee:{" "}
                                      <strong className="text-on-surface">
                                        {assignee?.fullName || "Assigned Member"}
                                      </strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Due:{" "}
                                      {subtask.deadline
                                        ? new Date(subtask.deadline).toLocaleDateString()
                                        : "None"}
                                    </span>
                                  </div>
                                </div>

                                {/* Subtask Quick Actions */}
                                <div className="flex items-center gap-2 self-start sm:self-center">
                                  {subtask.status === "ready_for_review" && (
                                    <>
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        disabled={actionTaskId === subtask.id}
                                        onClick={() =>
                                          handleQuickAction(subtask.id, completeTaskAction)
                                        }
                                      >
                                        {actionTaskId === subtask.id
                                          ? "Approving..."
                                          : "Approve"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={actionTaskId === subtask.id}
                                        onClick={() => setFeedbackTask(subtask)}
                                      >
                                        Changes
                                      </Button>
                                    </>
                                  )}

                                  <Link href={`/workspace/tasks/${subtask.id}`}>
                                    <Button variant="outline" size="sm">
                                      Inspect →
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 2. Standalone Subtasks (e.g. filtered view) */}
                {standaloneSubtasks.map((subtask) => {
                  const assignee = members.find((m) => m.userId === subtask.assignee_id);

                  return (
                    <div
                      key={subtask.id}
                      className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge variant="neutral" size="sm">
                            SUBTASK
                          </StatusBadge>
                          <LabelCode size="sm" className="text-primary font-bold">
                            {subtask.task_code}
                          </LabelCode>
                          <StatusBadge
                            variant={getStatusBadgeVariant(subtask.status)}
                            size="sm"
                          >
                            {subtask.status.toUpperCase()}
                          </StatusBadge>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${getPriorityColor(
                              subtask.priority
                            )}`}
                          >
                            {subtask.priority}
                          </span>
                        </div>

                        <Link
                          href={`/workspace/tasks/${subtask.id}`}
                          className="font-sans font-bold text-body-md text-on-surface hover:text-primary transition-colors"
                        >
                          {subtask.title}
                        </Link>

                        <div className="flex items-center gap-3 text-label-code-sm text-secondary">
                          <span>
                            Assignee:{" "}
                            <strong className="text-on-surface">
                              {assignee?.fullName || "Assigned Member"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Due:{" "}
                            {subtask.deadline
                              ? new Date(subtask.deadline).toLocaleDateString()
                              : "None"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {subtask.status === "ready_for_review" && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionTaskId === subtask.id}
                              onClick={() =>
                                handleQuickAction(subtask.id, completeTaskAction)
                              }
                            >
                              {actionTaskId === subtask.id ? "Approving..." : "Approve"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionTaskId === subtask.id}
                              onClick={() => setFeedbackTask(subtask)}
                            >
                              Changes
                            </Button>
                          </>
                        )}

                        <Link href={`/workspace/tasks/${subtask.id}`}>
                          <Button variant="outline" size="sm">
                            Inspect →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 1 COLUMN: Team Workload Matrix */}
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex flex-col">
                  <LabelCaps className="text-primary font-bold">Team Workload</LabelCaps>
                  <span className="text-label-code-sm text-secondary">
                    {members.length} active members
                  </span>
                </div>
                <StatusBadge variant="neutral" size="sm">
                  LIVE CAPACITY
                </StatusBadge>
              </div>

              {members.length === 0 ? (
                <div className="py-4 text-center text-label-code-sm text-secondary">
                  No active members in this group.
                </div>
              ) : (
                <div className="flex flex-col gap-3 divide-y divide-outline-variant/60">
                  {members.map((member) => {
                    const badgeVariant =
                      member.availability === "Available"
                        ? "success"
                        : member.availability === "Moderate"
                        ? "neutral"
                        : "error";

                    return (
                      <div key={member.userId} className="pt-3 first:pt-0 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-sans font-bold text-body-sm text-on-surface">
                              {member.fullName}
                            </span>
                            <span className="text-[11px] text-secondary truncate max-w-[160px]">
                              {member.email}
                            </span>
                          </div>

                          <StatusBadge variant={badgeVariant} size="sm">
                            {member.availability.toUpperCase()}
                          </StatusBadge>
                        </div>

                        <div className="flex items-center justify-between text-label-code-sm text-secondary">
                          <span>Active Tasks:</span>
                          <strong className="text-on-surface font-mono">
                            {member.activeTaskCount}
                          </strong>
                        </div>

                        {/* Recent active tasks snippet */}
                        {member.activeTasks.length > 0 && (
                          <div className="flex flex-col gap-1 pl-2 border-l border-outline-variant">
                            {member.activeTasks.slice(0, 2).map((t) => (
                              <Link
                                key={t.id}
                                href={`/workspace/tasks/${t.id}`}
                                className="text-[11px] font-mono text-secondary hover:text-primary truncate block"
                              >
                                {t.taskCode} • {t.title}
                              </Link>
                            ))}
                            {member.activeTasks.length > 2 && (
                              <span className="text-[10px] text-secondary">
                                + {member.activeTasks.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Scope Reference Card */}
            <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-2 text-label-code-sm text-secondary">
              <span className="font-semibold text-on-surface font-sans">
                Group Head Operational Rules:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Directives are assigned to you by Main Head.</li>
                <li>Accept incoming directives to acknowledge responsibility.</li>
                <li>Decompose directives into subtasks and assign to active group members.</li>
                <li>Review submitted member work before marking directives complete.</li>
              </ul>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Task Delegation Drawer */}
      <TaskDelegationDrawer
        isOpen={isDelegationOpen}
        onClose={() => setIsDelegationOpen(false)}
        parentTasks={parentDirectives}
        preselectedParentTaskId={delegationParentId}
        members={members}
        onSubtaskDelegated={() => {
          router.refresh();
        }}
      />

      {/* Request Changes Modal */}
      {feedbackTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setFeedbackTask(null)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-md rounded bg-surface-container-lowest border border-outline-variant shadow-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <div className="flex flex-col">
                <LabelCaps className="text-error font-bold">Request Changes</LabelCaps>
                <h4 className="font-sans font-bold text-body-lg text-on-surface">
                  {feedbackTask.title}
                </h4>
              </div>
              <button
                onClick={() => setFeedbackTask(null)}
                className="text-secondary hover:text-on-surface p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestChangesSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="feedbackNotes"
                  className="font-sans text-label-code-md text-on-surface font-semibold"
                >
                  Feedback & Required Revisions
                </label>
                <textarea
                  id="feedbackNotes"
                  rows={4}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Detail the revisions needed before this work can be approved..."
                  className="w-full p-3 rounded bg-surface-container border border-outline font-sans text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFeedbackTask(null)}
                  disabled={actionTaskId === feedbackTask.id}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={actionTaskId === feedbackTask.id}
                >
                  {actionTaskId === feedbackTask.id
                    ? "Submitting..."
                    : "Submit Changes Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
