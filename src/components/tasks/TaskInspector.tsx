"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { TaskHeader } from "./TaskHeader";
import { TaskActionStrip } from "./TaskActionStrip";
import { TaskOverviewTab } from "./TaskOverviewTab";
import { TaskSubtasksTab } from "./TaskSubtasksTab";
import { TaskConversationTab } from "./TaskConversationTab";
import { TaskFilesTab } from "./TaskFilesTab";
import { TaskActivityTab } from "./TaskActivityTab";
import type { TaskWithFullDetails } from "@/lib/tasks/types";

interface TaskInspectorProps {
  task: TaskWithFullDetails;
}

export function TaskInspector({ task }: TaskInspectorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "subtasks" | "discussion" | "files" | "activity">("overview");

  const handleRefresh = () => {
    router.refresh();
  };

  interface InspectorTab {
    id: "overview" | "subtasks" | "discussion" | "files" | "activity";
    label: string;
    count?: number;
  }

  const tabs: InspectorTab[] = [
    { id: "overview", label: "Overview & Scope" },
    {
      id: "subtasks",
      label: "Subtasks & Tree",
      count: task.subtasks.length,
    },
    {
      id: "discussion",
      label: "Discussion",
      count: task.comments.length,
    },
    {
      id: "files",
      label: "Files & Specs",
      count: task.files.length,
    },
    {
      id: "activity",
      label: "What Changed",
      count: task.activities.length,
    },
  ];

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        <div className="flex flex-col gap-6">
          {/* Header */}
          <TaskHeader task={task} />

          {/* Role-Aware Action Strip */}
          <TaskActionStrip task={task} onRefresh={handleRefresh} />

          {/* Progressive Disclosure Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-outline-variant overflow-x-auto pb-0.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 font-sans text-body-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                    isActive
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-secondary hover:text-on-surface hover:border-outline-variant"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full border leading-tight ${
                        isActive
                          ? "bg-primary-fixed text-on-primary-fixed border-primary/20"
                          : "bg-surface-container text-secondary border-outline-variant"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div className="pt-2">
            {activeTab === "overview" && (
              <TaskOverviewTab task={task} onRefresh={handleRefresh} />
            )}
            {activeTab === "subtasks" && (
              <TaskSubtasksTab task={task} onRefresh={handleRefresh} />
            )}
            {activeTab === "discussion" && (
              <TaskConversationTab task={task} onRefresh={handleRefresh} />
            )}
            {activeTab === "files" && <TaskFilesTab task={task} />}
            {activeTab === "activity" && <TaskActivityTab task={task} />}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
