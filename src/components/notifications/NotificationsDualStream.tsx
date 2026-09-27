"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import type { NotificationWithDetails, WhatChangedItem } from "@/lib/notifications/types";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/notifications/actions";

interface NotificationsDualStreamProps {
  initialNotifications: NotificationWithDetails[];
  initialWhatChanged: WhatChangedItem[];
  userRole?: string | null;
}

export function NotificationsDualStream({
  initialNotifications,
  initialWhatChanged,
  userRole,
}: NotificationsDualStreamProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>(initialNotifications);
  const [whatChanged] = useState<WhatChangedItem[]>(initialWhatChanged);
  const [markingAll, setMarkingAll] = useState(false);

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getTypeBadgeLabel = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "Assignment";
      case "task_accepted":
        return "Accepted";
      case "task_delegated":
        return "Delegation";
      case "review_requested":
        return "Review";
      case "task_approved":
        return "Approved";
      case "task_reassigned":
        return "Reassigned";
      case "comment_mention":
        return "Discussion";
      case "system_alert":
        return "Security / System";
      default:
        return "Notification";
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadAction();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationWithDetails) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      markNotificationReadAction(notif.id).catch(() => {});
    }
    if (notif.targetUrl) {
      router.push(notif.targetUrl);
    }
  };

  const handleMarkSingleRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    await markNotificationReadAction(id);
  };

  const displayedNotifications =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const roleLabel =
    userRole === "main_head"
      ? "Institutional Feed (Organization-Wide)"
      : userRole === "group_head"
      ? "Group Activity Feed (Directives & Members)"
      : "Personal Workbench Feed (Assigned Tasks)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Stream 1: Direct Notifications */}
      <div className="flex flex-col gap-4">
        {/* Stream 1 Header */}
        <div className="p-5 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">1. Direct Attention Ledger</LabelCaps>
              {unreadCount > 0 && (
                <span className="font-mono text-label-code-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-label-code-xs text-secondary hover:text-primary transition-colors focus-visible:outline-none"
              >
                {markingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>

          <p className="text-body-sm text-secondary">
            Personal directives, review requests, reassignment notices, and direct notes requiring your attention.
          </p>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded text-body-sm transition-colors ${
                filter === "all"
                  ? "bg-surface-container text-on-surface font-semibold border border-outline-variant"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded text-body-sm transition-colors flex items-center gap-1.5 ${
                filter === "unread"
                  ? "bg-surface-container text-on-surface font-semibold border border-outline-variant"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex flex-col gap-2.5">
          {displayedNotifications.length === 0 ? (
            <div className="p-8 rounded bg-surface-container-lowest border border-dashed border-outline-variant text-center flex flex-col items-center justify-center gap-1.5">
              <span className="font-sans text-body-md text-on-surface font-medium">
                {filter === "unread" ? "No unread notifications" : "No notifications recorded"}
              </span>
              <span className="text-body-sm text-secondary max-w-sm">
                {filter === "unread"
                  ? "You have reviewed all incoming assignments and notices."
                  : "New directives and operational alerts will appear here as they are issued."}
              </span>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 rounded border transition-all cursor-pointer flex flex-col gap-2 ${
                  notif.isRead
                    ? "bg-surface-container-lowest border-outline-variant hover:border-outline text-secondary"
                    : "bg-surface-container-low border-primary/30 hover:border-primary shadow-subtle text-on-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container text-secondary font-semibold">
                      {getTypeBadgeLabel(notif.type)}
                    </span>
                    {notif.taskCode && (
                      <span className="font-mono text-label-code-xs font-bold text-primary">
                        {notif.taskCode}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-secondary">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-body-sm ${
                      notif.isRead ? "text-on-surface font-medium" : "text-on-surface font-semibold"
                    }`}
                  >
                    {notif.title}
                  </span>
                  {notif.body && (
                    <p className="text-body-sm text-secondary leading-relaxed line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                </div>

                <div className="pt-1 flex items-center justify-between text-label-code-xs text-secondary border-t border-outline-variant/40">
                  <span>From: {notif.actorName || "ClubOS"}</span>
                  <div className="flex items-center gap-2">
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkSingleRead(e, notif.id)}
                        className="text-secondary hover:text-primary underline-offset-2 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    <span className="text-primary font-medium hover:underline">
                      View details →
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stream 2: What Changed Audit Ledger */}
      <div className="flex flex-col gap-4">
        {/* Stream 2 Header */}
        <div className="p-5 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <LabelCaps className="text-primary font-bold">2. What Changed (State Audit)</LabelCaps>
            <span className="font-mono text-label-code-xs text-secondary uppercase">
              {userRole?.replace("_", " ") || "ROLE SCOPED"}
            </span>
          </div>
          <p className="text-body-sm text-secondary">
            {roleLabel}. Granular timeline of task lifecycle changes, review requests, blockers, and completions.
          </p>
        </div>

        {/* What Changed Feed */}
        <div className="flex flex-col gap-2.5">
          {whatChanged.length === 0 ? (
            <div className="p-8 rounded bg-surface-container-lowest border border-dashed border-outline-variant text-center flex flex-col items-center justify-center gap-1.5">
              <span className="font-sans text-body-md text-on-surface font-medium">
                No recent changes in your authorized scope
              </span>
              <span className="text-body-sm text-secondary max-w-sm">
                Activity events on tasks and directives will be recorded in this timeline as work progresses.
              </span>
            </div>
          ) : (
            whatChanged.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-2 hover:border-outline transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                    {item.taskCode ? (
                      <Link
                        href={`/workspace/tasks/${item.taskId}`}
                        className="font-mono text-label-code-xs font-bold text-primary hover:underline"
                      >
                        {item.taskCode}
                      </Link>
                    ) : (
                      <span className="font-mono text-label-code-xs text-secondary font-medium">
                        Institutional Event
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-secondary">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                <p className="font-sans text-body-sm text-on-surface leading-snug">
                  {item.description}
                </p>

                {item.details && (
                  <div className="p-2.5 rounded bg-surface-container-low text-body-sm text-secondary border border-outline-variant/60 italic font-sans">
                    "{item.details}"
                  </div>
                )}

                {item.targetUrl && (
                  <div className="pt-1 flex items-center justify-end">
                    <Link
                      href={item.targetUrl}
                      className="text-label-code-xs text-primary hover:underline font-medium"
                    >
                      Open task inspector →
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
