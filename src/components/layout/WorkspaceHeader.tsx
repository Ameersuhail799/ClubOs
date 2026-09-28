"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brandmark } from "@/components/brand/Brandmark";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  currentScope?: string;
  userEmail?: string;
  userName?: string;
  role?: string | null;
  organizationName?: string;
  primaryGroupName?: string;
}

export function WorkspaceHeader({
  currentScope,
  userEmail,
  userName,
  role,
  organizationName,
  primaryGroupName,
}: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Compute authoritative scope badge
  const scopeBadge =
    currentScope ||
    (role === "main_head"
      ? `MAIN HEAD • ${organizationName?.toUpperCase() || "COMMAND CENTER"}`
      : role === "group_head"
      ? `GROUP HEAD • ${primaryGroupName?.toUpperCase() || "GROUP WORKSPACE"}`
      : role === "member"
      ? `MEMBER • ${primaryGroupName?.toUpperCase() || "MY DAY"}`
      : "WORKSPACE");

  // Filter links according to authoritative role
  const allNavLinks = [
    {
      href: "/workspace/command-center",
      label: "Command Center",
      roles: ["main_head"],
    },
    {
      href: "/workspace/tasks",
      label: "Workboard",
      roles: ["main_head", "group_head", "member"],
    },
    {
      href: "/workspace/group",
      label: "Group",
      roles: ["main_head", "group_head"],
    },
    {
      href: "/workspace/admin/members",
      label: "Members",
      roles: ["main_head"],
    },
    {
      href: "/workspace/admin/content",
      label: "Public Content",
      roles: ["main_head"],
    },
    {
      href: "/workspace/my-day",
      label: "My Day",
      roles: ["member"],
    },
    {
      href: "/workspace/my-tasks",
      label: "My Tasks",
      roles: ["member"],
    },
    {
      href: "/workspace/todo",
      label: "Todo",
      roles: ["member"],
    },
    {
      href: "/workspace/updates",
      label: "Updates",
      roles: ["member"],
    },
    {
      href: "/workspace/my-group",
      label: "My Group",
      roles: ["member"],
    },
    {
      href: "/workspace/profile",
      label: "Profile",
      roles: ["member"],
    },
    {
      href: "/workspace/notifications",
      label: "Notifications",
      roles: ["main_head", "group_head", "member"],
    },
  ];

  const visibleNavLinks = allNavLinks.filter(
    (link) => !role || link.roles.includes(role)
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-container-lowest border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand + Scope Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/workspace"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded py-1 shrink-0"
            aria-label="ClubOS Workspace"
          >
            <Brandmark showSubtitle={false} />
          </Link>
          <div className="hidden sm:block h-4 w-[1px] bg-outline-variant shrink-0" />
          <StatusBadge variant="group" size="sm" className="hidden sm:inline-flex whitespace-nowrap shrink-0">
            {scopeBadge}
          </StatusBadge>
        </div>

        {/* Center: Desktop Workspace Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0" aria-label="Workspace Navigation">
          {visibleNavLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-2.5 xl:px-3 py-1.5 rounded text-body-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  isActive
                    ? "bg-surface-container text-primary font-semibold border border-outline-variant"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Notification Bell, User identity info & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationBell />

          {(userName || userEmail) && (
            <div className="hidden lg:flex flex-col text-right leading-tight max-w-[140px] xl:max-w-[200px] shrink-0">
              <span className="text-body-sm font-medium text-on-surface truncate" title={userName || userEmail}>
                {userName || userEmail}
              </span>
              {role && (
                <span className="text-label-code-xs text-secondary uppercase font-mono tracking-wider">
                  {role.replace("_", " ")}
                </span>
              )}
            </div>
          )}

          <form action="/auth/signout" method="POST" className="shrink-0">
            <button
              type="submit"
              className="text-body-sm font-medium text-on-surface-variant hover:text-error transition-colors px-2.5 py-1.5 rounded border border-transparent hover:border-outline-variant hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-error whitespace-nowrap shrink-0"
              title="Terminate authenticated session"
            >
              Sign Out
            </button>
          </form>

          {/* Mobile Navigation Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 rounded text-secondary hover:text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
            aria-expanded={mobileOpen}
            aria-label="Toggle workspace navigation menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Workspace Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-outline-variant bg-surface-container-lowest px-4 py-3 flex flex-col gap-2 shadow-card animate-in fade-in duration-150">
          <div className="pb-2.5 border-b border-outline-variant flex items-center justify-between gap-2">
            <StatusBadge variant="group" size="sm" className="whitespace-nowrap">
              {scopeBadge}
            </StatusBadge>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                onClick={() => setMobileOpen(false)}
                className="text-body-sm text-error hover:underline font-medium px-2 py-1"
              >
                Sign Out
              </button>
            </form>
          </div>
          <div className="flex flex-col gap-1 pt-1">
            {visibleNavLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-3 py-2 rounded text-body-md font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-surface-container text-primary font-semibold border border-outline-variant"
                      : "text-on-surface hover:bg-surface-container-low"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
