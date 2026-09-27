"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import type { NotificationWithDetails } from "@/lib/notifications/types";
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/notifications/actions";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  onUnreadChange,
}: NotificationDrawerProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Load notifications whenever drawer opens or filter changes
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotificationsAction(filter);
      if (res.success && res.data) {
        setNotifications(res.data);
        const unreadCount = res.data.filter((n) => !n.isRead).length;
        if (onUnreadChange) onUnreadChange(unreadCount);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadAction();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      if (onUnreadChange) onUnreadChange(0);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationWithDetails) => {
    if (!notif.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      markNotificationReadAction(notif.id).catch(() => {});
      if (onUnreadChange) {
        const remaining = notifications.filter((n) => !n.isRead && n.id !== notif.id).length;
        onUnreadChange(remaining);
      }
    }
    onClose();
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
    if (onUnreadChange) {
      const remaining = notifications.filter((n) => !n.isRead && n.id !== id).length;
      onUnreadChange(remaining);
    }
  };

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
        return "Notice";
      default:
        return "Alert";
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] transition-opacity duration-200"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Notification Center"
    >
      <div
        ref={drawerRef}
        className="w-full max-w-md h-full bg-surface-container-lowest border-l border-outline-variant shadow-2xl flex flex-col focus:outline-none animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <LabelCaps className="text-primary font-bold text-base">Notifications</LabelCaps>
            {unreadCount > 0 && (
              <span className="font-mono text-label-code-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-label-code-xs text-secondary hover:text-primary transition-colors px-2 py-1 rounded hover:bg-surface-container focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                {markingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close notifications drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center px-4 sm:px-5 border-b border-outline-variant bg-surface-container-low/40">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`py-2.5 px-3 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === "all"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-secondary hover:text-on-surface"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`py-2.5 px-3 text-body-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              filter === "unread"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-secondary hover:text-on-surface"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container text-secondary">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-2.5">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-label-code-xs text-secondary">Loading attention ledger...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2 px-4">
              <span className="text-body-md font-sans text-on-surface font-medium">
                {filter === "unread" ? "You're completely caught up" : "No notifications yet"}
              </span>
              <span className="text-body-sm text-secondary max-w-xs">
                {filter === "unread"
                  ? "All direct task assignments, review requests, and mentions have been reviewed."
                  : "Institutional directives and task updates will appear here when action is needed."}
              </span>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 rounded border transition-all cursor-pointer flex flex-col gap-1.5 relative ${
                  notif.isRead
                    ? "bg-surface-container-lowest border-outline-variant hover:border-outline text-secondary"
                    : "bg-surface-container-low border-primary/30 hover:border-primary shadow-subtle text-on-surface"
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!notif.isRead && (
                      <span
                        className="w-2 h-2 rounded-full bg-primary shrink-0"
                        title="Unread notification"
                      />
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
                  <span className="font-mono text-[11px] text-secondary whitespace-nowrap">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                </div>

                {/* Title */}
                <span className={`text-body-sm font-medium leading-snug ${notif.isRead ? "text-on-surface/80" : "text-on-surface font-semibold"}`}>
                  {notif.title}
                </span>

                {/* Body context */}
                {notif.body && (
                  <p className="text-body-xs text-secondary line-clamp-2 leading-relaxed">
                    {notif.body}
                  </p>
                )}

                {/* Footer action */}
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-secondary/70">
                    From {notif.actorName || "System"}
                  </span>

                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkSingleRead(e, notif.id)}
                      className="text-secondary hover:text-primary underline-offset-2 hover:underline focus-visible:outline-none"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
