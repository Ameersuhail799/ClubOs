"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { MemberTaskRow } from "./MemberTaskRow";
import { PersonalTodoCard } from "./PersonalTodoCard";
import { WhatChangedLedger } from "./WhatChangedLedger";
import type { MemberWorkbenchData, TaskWithDetails } from "@/lib/tasks/types";

interface MemberWorkbenchContentProps {
  initialData: MemberWorkbenchData;
  initialTab?: "my-day" | "my-tasks" | "todo";
}

export function MemberWorkbenchContent({
  initialData,
  initialTab = "my-day",
}: MemberWorkbenchContentProps) {
  const router = useRouter();
  const [data, setData] = useState<MemberWorkbenchData>(initialData);
  const [activeTab, setActiveTab] = useState<"my-day" | "my-tasks" | "todo">(initialTab);

  // My Tasks filter
  const [taskFilter, setTaskFilter] = useState<
    "all" | "needs_action" | "in_progress" | "ready_for_review" | "completed"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { member, capacity, tasks, todos, recentActivity } = data;

  const handleRefresh = () => {
    router.refresh();
  };

  const getCapacityBadgeVariant = (status: "Available" | "Moderate" | "Busy") => {
    switch (status) {
      case "Available":
        return "success";
      case "Moderate":
        return "neutral";
      case "Busy":
        return "error";
    }
  };

  // Filter for My Tasks view
  const filteredMyTasks = tasks.all.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCode = t.task_code.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchDesc) return false;
    }

    if (taskFilter === "needs_action") {
      return (
        t.status === "assigned" ||
        t.status === "blocked" ||
        (t.status === "in_progress" &&
          recentActivity.some((a) => a.taskId === t.id && a.action === "task_reviewed"))
      );
    }
    if (taskFilter === "in_progress") {
      return t.status === "in_progress" || t.status === "accepted";
    }
    if (taskFilter === "ready_for_review") {
      return t.status === "ready_for_review";
    }
    if (taskFilter === "completed") {
      return t.status === "completed";
    }

    return true;
  });

  const readyForReviewCount = tasks.all.filter((t) => t.status === "ready_for_review").length;
  const completedCount = tasks.all.filter((t) => t.status === "completed").length;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="py-6 sm:py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Scope & Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Personal Workbench</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="active" size="sm">
                MEMBER SCOPE
              </StatusBadge>
              {member.primaryGroup && (
                <>
                  <span className="text-outline-variant">•</span>
                  <span className="font-mono text-label-code-xs text-secondary">
                    {member.primaryGroup.name}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <HeadlineMd>
                {activeTab === "my-day"
                  ? "My Day"
                  : activeTab === "my-tasks"
                  ? "My Tasks"
                  : "Private Scratchpad"}
              </HeadlineMd>
              <span className="font-mono text-label-code-sm text-secondary">
                {todayFormatted}
              </span>
            </div>

            <BodyMd className="text-secondary">
              {activeTab === "my-day"
                ? "Daily execution priorities, active assignments, and private scratchpad."
                : activeTab === "my-tasks"
                ? "Full directory of deliverables and subtasks assigned to you."
                : "Private scratchpad checklist. Strictly personal and never shared with leads."}
            </BodyMd>
          </div>

          {/* Right: Capacity Pill & View Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2 rounded bg-surface-container-low border border-outline-variant flex items-center gap-2">
              <span className="text-label-code-xs text-secondary">Capacity:</span>
              <StatusBadge variant={getCapacityBadgeVariant(capacity.status)} size="sm">
                {capacity.activeCount}/{capacity.maxRecommended} ACTIVE ({capacity.status.toUpperCase()})
              </StatusBadge>
            </div>

            {/* View switcher buttons */}
            <div className="inline-flex items-center bg-surface-container-low p-1 rounded border border-outline-variant">
              <button
                type="button"
                onClick={() => setActiveTab("my-day")}
                className={`px-3 py-1 rounded font-sans text-label-code-sm font-semibold transition-colors ${
                  activeTab === "my-day"
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:text-on-surface"
                }`}
              >
                My Day
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("my-tasks")}
                className={`px-3 py-1 rounded font-sans text-label-code-sm font-semibold transition-colors ${
                  activeTab === "my-tasks"
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:text-on-surface"
                }`}
              >
                My Tasks ({tasks.all.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("todo")}
                className={`px-3 py-1 rounded font-sans text-label-code-sm font-semibold transition-colors ${
                  activeTab === "todo"
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:text-on-surface"
                }`}
              >
                Todo ({todos.length})
              </button>
            </div>

            <Link href="/workspace/tasks">
              <Button variant="outline" size="sm">
                Workboard
              </Button>
            </Link>
          </div>
        </div>

        {/* TAB 1: MY DAY VIEW */}
        {activeTab === "my-day" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT 2 COLUMNS: Execution Priorities */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* 1. NEEDS ATTENTION SECTION */}
              {tasks.needsAttention.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LabelCaps className="text-primary font-bold uppercase">
                        Needs Attention
                      </LabelCaps>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30">
                        {tasks.needsAttention.length} requiring action
                      </span>
                    </div>
                    <span className="text-label-code-xs text-secondary">
                      Assigned or returned deliverables
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {tasks.needsAttention.map((task) => (
                      <MemberTaskRow
                        key={task.id}
                        task={task}
                        onRefresh={handleRefresh}
                        defaultExpanded={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 2. IN PROGRESS SECTION */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LabelCaps className="text-secondary font-bold uppercase">
                      Current In Progress
                    </LabelCaps>
                    <span className="text-label-code-xs bg-surface-container px-2 py-0.5 rounded text-secondary border border-outline-variant font-mono">
                      {tasks.inProgress.length} active
                    </span>
                  </div>
                  <span className="text-label-code-xs text-secondary">
                    Active working deliverables
                  </span>
                </div>

                {tasks.inProgress.length === 0 ? (
                  <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant text-center flex flex-col items-center justify-center gap-1">
                    <LabelCode size="sm" className="text-secondary">
                      NO ACTIVE SUBTASKS
                    </LabelCode>
                    <BodyMd className="text-secondary text-sm">
                      {tasks.needsAttention.length > 0
                        ? "Start work on one of your assigned deliverables above."
                        : "You currently have no active tasks in progress."}
                    </BodyMd>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {tasks.inProgress.map((task) => (
                      <MemberTaskRow
                        key={task.id}
                        task={task}
                        onRefresh={handleRefresh}
                        defaultExpanded={false}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* 3. PERSONAL TODO SCRATCHPAD */}
              <section className="flex flex-col gap-3">
                <PersonalTodoCard
                  todos={todos}
                  availableTasks={tasks.all}
                  onRefresh={handleRefresh}
                />
              </section>

              {/* 4. UPCOMING & COMPLETED (COMPACT) */}
              {(tasks.upcoming.length > 0 || tasks.completed.length > 0) && (
                <section className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center justify-between">
                    <LabelCaps className="text-secondary font-bold uppercase">
                      Upcoming & Submitted Work
                    </LabelCaps>
                    <span className="text-label-code-xs text-secondary font-mono">
                      {tasks.upcoming.length} upcoming · {tasks.completed.length} submitted/completed
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {tasks.upcoming.slice(0, 3).map((task) => (
                      <MemberTaskRow
                        key={task.id}
                        task={task}
                        onRefresh={handleRefresh}
                        defaultExpanded={false}
                      />
                    ))}
                    {tasks.completed.slice(0, 3).map((task) => (
                      <MemberTaskRow
                        key={task.id}
                        task={task}
                        onRefresh={handleRefresh}
                        defaultExpanded={false}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT 1 COLUMN: What Changed & Guidelines */}
            <div className="flex flex-col gap-6">
              {/* What Changed Ledger */}
              <WhatChangedLedger activities={recentActivity} />

              {/* Contributor Work Guidelines */}
              <div className="p-4 rounded bg-surface-container-low border border-outline-variant flex flex-col gap-2.5 text-label-code-sm text-secondary">
                <div className="flex items-center gap-2">
                  <LabelCaps className="text-on-surface font-semibold">
                    Contributor Workflow
                  </LabelCaps>
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-relaxed">
                  <li>
                    <strong>Start Work:</strong> Acknowledge your assigned subtask by clicking "Start Work".
                  </li>
                  <li>
                    <strong>Submit for Review:</strong> When your work is done, submit for Group Head verification.
                  </li>
                  <li>
                    <strong>Blockers:</strong> If blocked by dependencies, flag it early so leadership can assist.
                  </li>
                  <li>
                    <strong>Private Scratchpad:</strong> Use your private todo for checklist items—not visible to leads.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY TASKS FULL DIRECTORY */}
        {activeTab === "my-tasks" && (
          <div className="flex flex-col gap-4">
            {/* Filter Bar */}
            <div className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setTaskFilter("all")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    taskFilter === "all"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  All ({tasks.all.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("needs_action")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    taskFilter === "needs_action"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Needs Action ({tasks.needsAttention.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("in_progress")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    taskFilter === "in_progress"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  In Progress ({tasks.inProgress.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("ready_for_review")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    taskFilter === "ready_for_review"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Review ({readyForReviewCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("completed")}
                  className={`px-3 py-1.5 rounded font-sans text-label-code-sm font-semibold transition-colors whitespace-nowrap ${
                    taskFilter === "completed"
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Completed ({completedCount})
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Filter tasks by title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 px-3 rounded bg-surface-container border border-outline font-sans text-label-code-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-56"
              />
            </div>

            {/* Task Rows List */}
            {filteredMyTasks.length === 0 ? (
              <div className="p-8 rounded bg-surface-container-lowest border border-outline-variant text-center flex flex-col items-center justify-center gap-2">
                <LabelCode size="sm" className="text-secondary">
                  NO TASKS FOUND
                </LabelCode>
                <BodyMd className="text-secondary text-sm">
                  {searchQuery.trim()
                    ? `No tasks matching "${searchQuery}".`
                    : "No tasks found under this filter."}
                </BodyMd>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredMyTasks.map((task) => (
                  <MemberTaskRow
                    key={task.id}
                    task={task}
                    onRefresh={handleRefresh}
                    defaultExpanded={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PERSONAL TODO FOCUSED VIEW */}
        {activeTab === "todo" && (
          <div className="max-w-3xl mx-auto w-full">
            <PersonalTodoCard
              todos={todos}
              availableTasks={tasks.all}
              onRefresh={handleRefresh}
            />
          </div>
        )}
      </PageContainer>
    </div>
  );
}
