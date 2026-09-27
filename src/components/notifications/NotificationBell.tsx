"use client";

import React, { useState, useEffect } from "react";
import { NotificationDrawer } from "./NotificationDrawer";
import { getUnreadNotificationCountAction } from "@/lib/notifications/actions";

interface NotificationBellProps {
  initialUnreadCount?: number;
}

export function NotificationBell({ initialUnreadCount = 0 }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchCount() {
      try {
        const res = await getUnreadNotificationCountAction();
        if (isMounted && res.success && typeof res.data === "number") {
          setUnreadCount(res.data);
        }
      } catch {
        // Quiet fallback
      }
    }
    fetchCount();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="relative p-2 rounded text-secondary hover:text-on-surface hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications (none unread)"
        }
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.7}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary font-mono text-[10px] font-bold flex items-center justify-center border-2 border-surface-container-lowest leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUnreadChange={(cnt) => setUnreadCount(cnt)}
      />
    </>
  );
}
