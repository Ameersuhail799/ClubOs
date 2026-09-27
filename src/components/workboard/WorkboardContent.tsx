"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { WorkboardColumn } from "./WorkboardColumn";
import {
  transitionTaskWorkboardAction,
  getWorkboardDataAction,
} from "@/lib/tasks/actions";
import type {
  WorkboardData,
  WorkboardTask,
  TaskStatus,
  TaskPriority,
  WorkboardFilterOptions,
} from "@/lib/tasks/types";

interface WorkboardContentProps {
  initialData: WorkboardData;
  organizationName?: string;
  primaryGroupName?: string;
}

export function WorkboardContent({
  initialData,
  organizationName,
  primaryGroupName,
}: WorkboardContentProps) {
  const router = useRouter();
  const [isPendingRefresh, startTransition] = useTransition();

  // Data state
  const [boardData, setBoardData] = useState<WorkboardData>(initialData);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedScope, setSelectedScope] = useState<"all" | "my_work">("all");
  const [showArchived, setShowArchived] = useState(false);

  // Mobile column active tab
  const [mobileColumn, setMobileColumn] = useState<
    "assigned" | "in_progress" | "ready_for_review" | "completed" | "archived"
  >("assigned");

  const userRole = boardData.currentUser.role;
  const isMainHead = userRole === "main_head";
  const isGroupHead = userRole === "group_head";

  // Filter tasks based on client filters
  const filteredTasks = boardData.tasks.filter((task) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchCode = task.taskCode.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchDesc) return false;
    }

    // Group filter (for Main Head or multi-group)
    if (selectedGroup !== "all" && task.primaryGroupId !== selectedGroup) {
      return false;
    }

    // Priority filter
    if (selectedPriority !== "all" && task.priority !== selectedPriority) {
      return false;
    }

    // Scope filter (My Work)
    if (selectedScope === "my_work") {
      const uid = boardData.currentUser.id;
      const isMine =
        task.assigneeId === uid || task.assignedHeadId === uid;
      if (!isMine) return false;
    }

    return true;
  });

  // Segregate tasks into workflow columns
  const assignedTasks = filteredTasks.filter((t) => t.status === "assigned");
  const inProgressTasks = filteredTasks.filter(
    (t) => t.status === "in_progress" || t.status === "accepted" || t.status === "blocked"
  );
  const reviewTasks = filteredTasks.filter((t) => t.status === "ready_for_review");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");
  const archivedTasks = filteredTasks.filter(
    (t) => t.status === "draft" || t.status === "cancelled"
  );

  // Refresh board data from server with current server-side filters
  const reloadBoard = async () => {
    const filters: WorkboardFilterOptions = {
      search: searchQuery.trim() || undefined,
      groupId: selectedGroup,
      priority: selectedPriority as TaskPriority | "all",
      scope: selectedScope,
      includeArchived: showArchived,
    };

    const res = await getWorkboardDataAction(filters);
    if (res.success && res.data) {
      setBoardData(res.data);
    }
  };

  // Perform secure server action transition
  const handleTransition = async (
    taskId: string,
    targetStatus: TaskStatus,
    note?: string
  ) => {
    setPendingTaskId(taskId);
    setErrorMessage(null);

    try {
      const result = await transitionTaskWorkboardAction(taskId, targetStatus, note);

      if (!result.success) {
        setErrorMessage(result.error || "Failed to update task state.");
      } else {
        // Authoritative update: refresh data
        await reloadBoard();
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setPendingTaskId(null);
    }
  };

  // Drag and drop drop handler
  const handleDropTask = async (taskId: string, targetStatus: TaskStatus) => {
    const task = boardData.tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.status === targetStatus) return; // Idempotent

    // Check validity based on target column
    if (targetStatus === "in_progress") {
      if (task.status === "blocked") {
        await handleTransition(taskId, "in_progress", "__unblock__");
        return;
      }
      if (task.status === "ready_for_review") {
        if (!task.canPerformActions.canRequestChanges) {
          setErrorMessage("Only authorized Group Heads or Main Heads may request changes on submitted work.");
          return;
        }
        await handleTransition(taskId, "in_progress", "Changes requested via workboard");
        return;
      }
      if (!task.canPerformActions.canStart && !task.canPerformActions.canAccept) {
        setErrorMessage("You do not have permission to start or unblock this task.");
        return;
      }
      await handleTransition(taskId, "in_progress");
      return;
    }

    if (targetStatus === "ready_for_review") {
      if (!task.canPerformActions.canSubmitForReview) {
        setErrorMessage("Only the assigned executor may submit this task for review.");
        return;
      }
      await handleTransition(taskId, "ready_for_review");
      return;
    }

    if (targetStatus === "completed") {
      if (!task.canPerformActions.canComplete) {
        setErrorMessage(
          userRole === "member"
            ? "Members cannot self-approve or complete tasks. Work must be approved by a Group Head."
            : "You do not have permission to complete this task in its current state."
        );
        return;
      }
      await handleTransition(taskId, "completed");
      return;
    }

    if (targetStatus === "assigned") {
      setErrorMessage("Tasks cannot be moved back to the assigned stage once started.");
      return;
    }

    // Default transition attempt
    await handleTransition(taskId, targetStatus);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedGroup !== "all" ||
    selectedPriority !== "all" ||
    selectedScope !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGroup("all");
    setSelectedPriority("all");
    setSelectedScope("all");
  };

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Scope & Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Workflow Operations</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">
                {isMainHead
                  ? "MAIN HEAD • ORG WORKBOARD"
                  : isGroupHead
                  ? `GROUP HEAD • ${primaryGroupName?.toUpperCase() || "DIVISION"} WORKBOARD`
                  : `MEMBER • ${primaryGroupName?.toUpperCase() || "MY TASKS"} WORKBOARD`}
              </StatusBadge>
            </div>
            <HeadlineMd>Workboard</HeadlineMd>
            <BodyMd className="text-secondary text-sm">
              Visual workflow dispatch and status orchestration across active institutional deliverables.
            </BodyMd>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isMainHead && (
              <Link href="/workspace/command-center">
                <Button variant="outline" size="sm">
                  Command Center
                </Button>
              </Link>
            )}
            {isGroupHead && (
              <Link href="/workspace/group">
                <Button variant="outline" size="sm">
                  Group Workspace
                </Button>
              </Link>
            )}
            {!isMainHead && !isGroupHead && (
              <Link href="/workspace/my-day">
                <Button variant="outline" size="sm">
                  My Day
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={reloadBoard}
              disabled={isPendingRefresh}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-800 text-xs flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-700 hover:text-red-900 font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search tasks or codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary"
              />
              <svg
                className="w-4 h-4 absolute left-2.5 top-2 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Group Filter (Main Head only or when multiple groups exist) */}
            {isMainHead && boardData.groups.length > 1 && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">All Groups ({boardData.groups.length})</option>
                {boardData.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Scope Filter */}
            <div className="flex items-center rounded-md border border-outline-variant bg-surface-container-low p-0.5">
              <button
                type="button"
                onClick={() => setSelectedScope("all")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedScope === "all"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                    : "text-secondary hover:text-on-surface"
                }`}
              >
                All Work
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope("my_work")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedScope === "my_work"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                    : "text-secondary hover:text-on-surface"
                }`}
              >
                My Work
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-primary hover:underline font-medium"
              >
                Reset
              </button>
            )}
          </div>

          {/* Secondary View Toggle: Include Archived/Cancelled */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                showArchived
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-container-low text-secondary border-outline-variant hover:text-on-surface"
              }`}
            >
              <span>{showArchived ? "Hide Archived" : "Show Archived"}</span>
              {archivedTasks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                  {archivedTasks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Column Selector (< lg screens) */}
        <div className="flex lg:hidden overflow-x-auto gap-1.5 pb-1 border-b border-outline-variant scrollbar-none">
          <button
            type="button"
            onClick={() => setMobileColumn("assigned")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              mobileColumn === "assigned"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest border border-outline-variant text-secondary"
            }`}
          >
            <span>Assigned</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {assignedTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileColumn("in_progress")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              mobileColumn === "in_progress"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest border border-outline-variant text-secondary"
            }`}
          >
            <span>In Progress</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {inProgressTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileColumn("ready_for_review")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              mobileColumn === "ready_for_review"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest border border-outline-variant text-secondary"
            }`}
          >
            <span>Review</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {reviewTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileColumn("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              mobileColumn === "completed"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest border border-outline-variant text-secondary"
            }`}
          >
            <span>Completed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {completedTasks.length}
            </span>
          </button>

          {showArchived && (
            <button
              type="button"
              onClick={() => setMobileColumn("archived")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                mobileColumn === "archived"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-lowest border border-outline-variant text-secondary"
              }`}
            >
              <span>Archived</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                {archivedTasks.length}
              </span>
            </button>
          )}
        </div>

        {/* Board Columns: Desktop (Grid/Flex) and Mobile (Active Column) */}
        <div className="w-full">
          {/* Mobile Display: Only Selected Column */}
          <div className="flex flex-col lg:hidden">
            {mobileColumn === "assigned" && (
              <WorkboardColumn
                id="col-assigned"
                title="ASSIGNED"
                count={assignedTasks.length}
                description="Dispatched tasks awaiting lead acceptance or execution"
                tasks={assignedTasks}
                targetStatus="assigned"
                onDropTask={handleDropTask}
                onTransition={handleTransition}
                pendingTaskId={pendingTaskId}
                emptyMessage="No assigned directives awaiting pickup."
              />
            )}
            {mobileColumn === "in_progress" && (
              <WorkboardColumn
                id="col-in_progress"
                title="IN PROGRESS"
                count={inProgressTasks.length}
                description="Active deliverables and accepted directives underway"
                tasks={inProgressTasks}
                targetStatus="in_progress"
                onDropTask={handleDropTask}
                onTransition={handleTransition}
                pendingTaskId={pendingTaskId}
                emptyMessage="No tasks currently in progress."
              />
            )}
            {mobileColumn === "ready_for_review" && (
              <WorkboardColumn
                id="col-ready_for_review"
                title="REVIEW"
                count={reviewTasks.length}
                description="Completed deliverables submitted for leadership review"
                tasks={reviewTasks}
                targetStatus="ready_for_review"
                onDropTask={handleDropTask}
                onTransition={handleTransition}
                pendingTaskId={pendingTaskId}
                emptyMessage="No work awaiting approval."
              />
            )}
            {mobileColumn === "completed" && (
              <WorkboardColumn
                id="col-completed"
                title="COMPLETED"
                count={completedTasks.length}
                description="Institutional deliverables verified and completed"
                tasks={completedTasks}
                targetStatus="completed"
                onDropTask={handleDropTask}
                onTransition={handleTransition}
                pendingTaskId={pendingTaskId}
                emptyMessage="No completed deliverables recorded."
              />
            )}
            {mobileColumn === "archived" && showArchived && (
              <WorkboardColumn
                id="col-archived"
                title="DRAFTS & CANCELLED"
                count={archivedTasks.length}
                description="Archived, cancelled, or preliminary draft records"
                tasks={archivedTasks}
                targetStatus="cancelled"
                onDropTask={handleDropTask}
                onTransition={handleTransition}
                pendingTaskId={pendingTaskId}
                emptyMessage="No draft or cancelled records found."
              />
            )}
          </div>

          {/* Desktop Display: All 4 Horizontal Columns + Optional Archived */}
          <div
            className={`hidden lg:grid gap-4 items-start ${
              showArchived ? "grid-cols-5" : "grid-cols-4"
            }`}
          >
            {/* Column 1: ASSIGNED */}
            <WorkboardColumn
              id="col-assigned"
              title="ASSIGNED"
              count={assignedTasks.length}
              description="Dispatched directives awaiting pickup"
              tasks={assignedTasks}
              targetStatus="assigned"
              onDropTask={handleDropTask}
              onTransition={handleTransition}
              pendingTaskId={pendingTaskId}
              emptyMessage="No tasks awaiting pickup."
            />

            {/* Column 2: IN PROGRESS */}
            <WorkboardColumn
              id="col-in_progress"
              title="IN PROGRESS"
              count={inProgressTasks.length}
              description="Accepted work & active execution"
              tasks={inProgressTasks}
              targetStatus="in_progress"
              onDropTask={handleDropTask}
              onTransition={handleTransition}
              pendingTaskId={pendingTaskId}
              emptyMessage="No work currently in progress."
            />

            {/* Column 3: REVIEW */}
            <WorkboardColumn
              id="col-ready_for_review"
              title="REVIEW"
              count={reviewTasks.length}
              description="Deliverables awaiting sign-off"
              tasks={reviewTasks}
              targetStatus="ready_for_review"
              onDropTask={handleDropTask}
              onTransition={handleTransition}
              pendingTaskId={pendingTaskId}
              emptyMessage="No deliverables in review."
            />

            {/* Column 4: COMPLETED */}
            <WorkboardColumn
              id="col-completed"
              title="COMPLETED"
              count={completedTasks.length}
              description="Verified institutional records"
              tasks={completedTasks}
              targetStatus="completed"
              onDropTask={handleDropTask}
              onTransition={handleTransition}
              pendingTaskId={pendingTaskId}
              emptyMessage="No completed deliverables."
            />

            {/* Column 5: DRAFTS & CANCELLED (Secondary view) */}
            {showArchived && (
              <WorkboardColumn
                id="col-archived"
                title="DRAFTS & CANCELLED"
                count={archivedTasks.length}
                description="Draft and cancelled records"
                tasks={archivedTasks}
                targetStatus="cancelled"
                onDropTask={handleDropTask}
                onTransition={handleTransition}
                pendingTaskId={pendingTaskId}
                emptyMessage="No archived tasks."
              />
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
