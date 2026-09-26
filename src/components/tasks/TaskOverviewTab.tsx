"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { LabelCaps, LabelCode, BodyMd } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { grantTaskAccessAction, revokeTaskAccessAction } from "@/lib/tasks/actions";
import type { TaskWithFullDetails, TaskPermission } from "@/lib/tasks/types";

interface TaskOverviewTabProps {
  task: TaskWithFullDetails;
  onRefresh?: () => void;
}

export function TaskOverviewTab({ task, onRefresh }: TaskOverviewTabProps) {
  const [isGranting, setIsGranting] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [permission, setPermission] = useState<TaskPermission>("view");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await grantTaskAccessAction({
        taskId: task.id,
        userId: targetUserId,
        permission,
      });
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        setIsGranting(false);
        setTargetUserId("");
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleRevoke = (accessId: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await revokeTaskAccessAction(task.id, accessId);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        if (onRefresh) onRefresh();
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Scope, Parent Directive, and Collaboration */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Scope & Description Box */}
        <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
          <LabelCaps className="text-secondary font-semibold">
            Scope & Deliverable Specifications
          </LabelCaps>
          {task.description ? (
            <div className="font-sans text-body-md text-on-surface whitespace-pre-line leading-relaxed">
              {task.description}
            </div>
          ) : (
            <BodyMd className="text-secondary italic">
              No written scope notes or instructions were provided when this directive was issued.
            </BodyMd>
          )}
        </div>

        {/* Parent Task Context (Recursive Hierarchy) */}
        {task.parentTaskDetail && (
          <div className="p-5 rounded bg-surface-container-low border border-outline-variant flex flex-col gap-2">
            <LabelCaps className="text-secondary font-semibold">
              Parent Directive Context
            </LabelCaps>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <LabelCode size="sm" className="text-primary font-bold">
                    {task.parentTaskDetail.taskCode}
                  </LabelCode>
                  <StatusBadge variant="neutral" size="sm">
                    {task.parentTaskDetail.status.toUpperCase()}
                  </StatusBadge>
                </div>
                <span className="font-sans text-body-md font-semibold text-on-surface mt-1">
                  {task.parentTaskDetail.title}
                </span>
              </div>
              <Link
                href={`/workspace/tasks/${task.parentTaskDetail.id}`}
                className="inline-flex items-center justify-center font-mono text-body-sm h-7 px-3 rounded border border-outline-variant bg-surface-container-lowest text-primary hover:bg-surface-container transition-colors shrink-0"
              >
                Inspect Parent Directive →
              </Link>
            </div>
          </div>
        )}

        {/* Cross-Group Collaboration / Explicit Task Access */}
        <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <LabelCaps className="text-secondary font-semibold">
                Cross-Group Collaboration & Explicit Access
              </LabelCaps>
              <span className="text-body-sm text-secondary">
                Explicit read/write permissions granted strictly to this task without group hopping.
              </span>
            </div>
            {task.canPerformActions.canManageAccess && !isGranting && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGranting(true)}
                className="text-body-sm h-7"
              >
                + Grant Access
              </Button>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-error-container text-on-error-container text-body-sm border border-error/20">
              {errorMsg}
            </div>
          )}

          {isGranting && (
            <form
              onSubmit={handleGrantSubmit}
              className="p-3.5 rounded bg-surface-container-low border border-outline-variant flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-body-sm font-semibold text-on-surface">
                  Grant Task-Level Collaboration
                </span>
                <button
                  type="button"
                  onClick={() => setIsGranting(false)}
                  className="text-secondary hover:text-on-surface text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-label-caps text-secondary">Target Member</label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    required
                    className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Member...</option>
                    {task.eligibleAssignees?.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.fullName} ({m.role.toUpperCase()} • {m.primaryGroupName || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-caps text-secondary">Permission</label>
                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as TaskPermission)}
                    className="p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
                  >
                    <option value="view">View Only</option>
                    <option value="comment">View & Comment</option>
                    <option value="edit">Full Edit Access</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGranting(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
                  Save Permission
                </Button>
              </div>
            </form>
          )}

          {task.collaborators.length > 0 ? (
            <div className="divide-y divide-outline-variant border-t border-outline-variant">
              {task.collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="py-2.5 flex items-center justify-between text-body-sm gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface font-sans">
                      {collab.targetName}
                    </span>
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border border-outline-variant bg-surface-container text-secondary">
                      {collab.permission}
                    </span>
                  </div>
                  {task.canPerformActions.canManageAccess && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(collab.id)}
                      disabled={isPending}
                      className="text-error hover:underline text-xs font-mono"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-body-sm text-secondary italic">
              No cross-group collaboration has been granted. Scoped to primary group.
            </span>
          )}
        </div>
      </div>

      {/* Right Column: Responsibility Hierarchy & Ledger Metadata */}
      <div className="flex flex-col gap-6">
        {/* Responsibility Hierarchy Ledger */}
        <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
          <LabelCaps className="text-secondary font-semibold">
            Institutional Chain of Responsibility
          </LabelCaps>

          <div className="flex flex-col gap-4 font-mono text-label-code-sm">
            {/* Originator */}
            <div className="flex flex-col pb-3 border-b border-outline-variant">
              <span className="text-secondary uppercase text-[10px] tracking-wider">
                ORIGINATOR / DIRECTIVE ISSUER
              </span>
              <span className="text-on-surface font-semibold text-body-sm mt-0.5">
                {task.creatorProfile?.fullName || "Main Head Directive"}
              </span>
              <span className="text-secondary text-[11px]">
                {task.creatorProfile?.email || "governance@clubos.internal"}
              </span>
            </div>

            {/* Functional Lead */}
            <div className="flex flex-col pb-3 border-b border-outline-variant">
              <span className="text-secondary uppercase text-[10px] tracking-wider">
                FUNCTIONAL GROUP LEAD
              </span>
              <span className="text-on-surface font-semibold text-body-sm mt-0.5">
                {task.assignedHeadProfile?.fullName || "Unassigned Group Head"}
              </span>
              <span className="text-secondary text-[11px]">
                {task.primaryGroup?.name || "General Group Scope"}
              </span>
            </div>

            {/* Assignee / Contributor */}
            <div className="flex flex-col">
              <span className="text-secondary uppercase text-[10px] tracking-wider">
                DELEGATEE / ACTIVE EXECUTOR
              </span>
              <span className="text-on-surface font-semibold text-body-sm mt-0.5">
                {task.assigneeProfile?.fullName ||
                  (task.is_volunteer_pool
                    ? "Open for Volunteers (Group Pool)"
                    : "Unassigned Contributor")}
              </span>
              <span className="text-secondary text-[11px]">
                {task.assigneeProfile?.email || "Awaiting task claim or assignment"}
              </span>
            </div>
          </div>
        </div>

        {/* Lifecycle Timestamps */}
        <div className="p-5 rounded bg-surface-container-low border border-outline-variant flex flex-col gap-2.5 font-mono text-label-code-sm">
          <LabelCaps className="text-secondary font-semibold">
            System Record Timestamps
          </LabelCaps>
          <div className="flex items-center justify-between text-secondary pt-1">
            <span>ISSUED:</span>
            <span className="text-on-surface">
              {new Date(task.created_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          <div className="flex items-center justify-between text-secondary">
            <span>LAST MODIFIED:</span>
            <span className="text-on-surface">
              {new Date(task.updated_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          {task.completed_at && (
            <div className="flex items-center justify-between text-secondary border-t border-outline-variant pt-2">
              <span className="text-primary font-bold">COMPLETED:</span>
              <span className="text-on-surface font-bold">
                {new Date(task.completed_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
