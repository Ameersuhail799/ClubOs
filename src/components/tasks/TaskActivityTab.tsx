"use client";

import React from "react";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import type { TaskWithFullDetails } from "@/lib/tasks/types";

interface TaskActivityTabProps {
  task: TaskWithFullDetails;
}

export function TaskActivityTab({ task }: TaskActivityTabProps) {
  const formatActionName = (action: string) => {
    return action
      .replace(/^task_/, "")
      .replace(/_/g, " ")
      .toUpperCase();
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "task_created":
      case "task_delegated":
        return "bg-secondary-container text-on-secondary-fixed-variant border-outline-variant";
      case "task_accepted":
      case "task_started":
        return "bg-primary-fixed text-on-primary-fixed border-primary/20";
      case "task_submitted_for_review":
        return "bg-surface-container-highest text-primary border-outline-variant";
      case "task_reviewed":
      case "task_completed":
        return "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/20";
      case "task_blocked":
      case "task_cancelled":
        return "bg-error-container text-on-error-container border-error/20";
      default:
        return "bg-surface-container text-secondary border-outline-variant";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Activity Header */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-1.5">
        <LabelCaps className="text-secondary font-semibold">
          Immutable System Audit Log (“What Changed”)
        </LabelCaps>
        <span className="text-body-sm text-secondary">
          Append-only cryptographic timeline of all operational transitions, assignment changes, and
          authoritative sign-offs. Records cannot be edited, altered, or deleted.
        </span>
      </div>

      {/* Activity Timeline List */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
        {task.activities.length > 0 ? (
          <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant flex flex-col gap-6">
            {task.activities.map((act) => {
              const formattedTime = new Date(act.createdAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div key={act.id} className="relative flex flex-col gap-1.5">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface-container-lowest" />

                  {/* Header Line */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider select-none ${getActionBadgeColor(
                          act.action
                        )}`}
                      >
                        {formatActionName(act.action)}
                      </span>
                      <span className="font-sans font-semibold text-body-sm text-on-surface">
                        {act.actorName}
                      </span>
                      {act.actorRole && (
                        <span className="font-mono text-[10px] text-secondary">
                          ({act.actorRole.replace("_", " ")})
                        </span>
                      )}
                    </div>
                    <LabelCode size="sm" className="text-secondary">
                      {formattedTime}
                    </LabelCode>
                  </div>

                  {/* State Diff / Metadata */}
                  {(act.previousState || act.newState || act.metadata) && (
                    <div className="p-3 rounded bg-surface-container-low border border-outline-variant font-mono text-label-code-sm text-secondary flex flex-col gap-1 mt-1">
                      {act.previousState && act.newState && (
                        <div className="flex items-center gap-2">
                          <span className="text-secondary">State Transition:</span>
                          <span className="text-error font-medium">
                            {act.previousState.status || JSON.stringify(act.previousState)}
                          </span>
                          <span>→</span>
                          <span className="text-primary font-bold">
                            {act.newState.status || JSON.stringify(act.newState)}
                          </span>
                        </div>
                      )}
                      {act.metadata?.reason && (
                        <div>
                          <span className="text-secondary">Reason / Note: </span>
                          <span className="text-on-surface font-sans text-body-sm">
                            {act.metadata.reason}
                          </span>
                        </div>
                      )}
                      {act.metadata?.feedback && (
                        <div>
                          <span className="text-secondary">Feedback: </span>
                          <span className="text-on-surface font-sans text-body-sm">
                            {act.metadata.feedback}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded bg-surface-container-low border border-dashed border-outline-variant text-center flex flex-col items-center gap-1.5">
            <span className="font-sans text-body-md text-on-surface font-medium">
              No audit records generated for this task yet.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
