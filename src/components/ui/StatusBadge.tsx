import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant = "neutral" | "active" | "pending" | "success" | "error" | "group";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant;
  children: React.ReactNode;
  size?: "sm" | "md";
}

export function StatusBadge({
  variant = "neutral",
  size = "md",
  children,
  className,
  ...props
}: StatusBadgeProps) {
  const variants = {
    neutral: "bg-surface-container text-secondary border-outline-variant",
    active: "bg-primary-fixed text-on-primary-fixed border-primary/20",
    pending: "bg-surface-container-high text-on-surface border-outline-variant",
    success: "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/20",
    error: "bg-error-container text-on-error-container border-error/20",
    group: "bg-surface-container-highest text-primary font-semibold border-outline-variant",
  };

  const sizes = {
    sm: "h-5 px-1.5 text-[10px] gap-1",
    md: "h-6 px-2 text-label-code-sm gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono rounded-full border uppercase tracking-wider select-none font-medium leading-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
