"use client";

import React, { useState } from "react";
import type { WorkboardTask, TaskStatus } from "@/lib/tasks/types";
import { WorkboardCard } from "./WorkboardCard";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";

interface WorkboardColumnProps {
  id: string;
  title: string;
  count: number;
  description: string;
  tasks: WorkboardTask[];
  targetStatus: TaskStatus;
  onDropTask: (taskId: string, targetStatus: TaskStatus) => Promise<void>;
  onTransition: (taskId: string, targetStatus: TaskStatus, note?: string) => Promise<void>;
  pendingTaskId?: string | null;
  emptyMessage: string;
}

export function WorkboardColumn({
  id,
  title,
  count,
  description,
  tasks,
  targetStatus,
  onDropTask,
  onTransition,
  pendingTaskId,
  emptyMessage,
}: WorkboardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set false if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const payloadStr = e.dataTransfer.getData("application/json");
      if (!payloadStr) return;
      const { taskId } = JSON.parse(payloadStr);
      if (taskId) {
        await onDropTask(taskId, targetStatus);
      }
    } catch (err) {
      console.error("Drop payload error:", err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col flex-1 min-w-[280px] max-w-full rounded-xl bg-surface-container-low/70 border transition-all duration-200 ${
        isDragOver
          ? "border-primary ring-2 ring-primary/20 bg-surface-container"
          : "border-outline-variant/80"
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-outline-variant/60 flex flex-col gap-1 bg-surface-container-lowest/50 rounded-t-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LabelCaps className="font-bold text-on-surface tracking-wider text-xs">
              {title}
            </LabelCaps>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-surface-container border border-outline-variant text-secondary">
              {count}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-secondary leading-tight line-clamp-1">
          {description}
        </p>
      </div>

      {/* Cards Container */}
      <div className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[160px]">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-outline-variant/60 rounded-lg bg-surface-container-lowest/30">
            <LabelCode size="sm" className="text-secondary/70">
              NO TASKS
            </LabelCode>
            <p className="text-xs text-secondary mt-1">{emptyMessage}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <WorkboardCard
              key={task.id}
              task={task}
              onTransition={onTransition}
              isPending={pendingTaskId === task.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
