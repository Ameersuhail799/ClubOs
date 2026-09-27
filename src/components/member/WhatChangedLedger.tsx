"use client";

import React from "react";
import Link from "next/link";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import type { MemberActivityItem } from "@/lib/tasks/types";

interface WhatChangedLedgerProps {
  activities: MemberActivityItem[];
}

export function WhatChangedLedger({ activities }: WhatChangedLedgerProps) {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${Math.max(1, diffMins)}m ago`;
      }
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded p-4 sm:p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <LabelCaps className="text-primary font-bold uppercase">What Changed</LabelCaps>
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
        <span className="font-mono text-label-code-xs text-secondary">Recent Ledger</span>
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="py-6 text-center text-label-code-sm text-secondary">
          No recent activity on your assigned tasks.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-3 rounded bg-surface-container-low border border-outline-variant flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-label-code-xs">
                <span className="text-secondary font-mono font-medium">
                  {act.taskCode ? (
                    <Link
                      href={`/workspace/tasks/${act.taskId}`}
                      className="text-primary hover:underline font-bold"
                    >
                      {act.taskCode}
                    </Link>
                  ) : (
                    "Task"
                  )}
                </span>
                <span className="text-secondary">{formatTime(act.createdAt)}</span>
              </div>

              <p className="font-sans text-body-sm text-on-surface leading-snug">
                {act.description}
              </p>

              {act.details && (
                <div className="p-2 rounded bg-surface-container text-body-sm text-secondary border border-outline-variant/50 italic">
                  "{act.details}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
