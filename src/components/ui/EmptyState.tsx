import React from "react";
import { cn } from "@/lib/utils";
import { HeadlineSm, BodySm } from "./Typography";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-space-xl text-center rounded border border-dashed border-outline-variant bg-surface-container-low/50",
        className
      )}
    >
      {icon && <div className="mb-space-sm text-secondary">{icon}</div>}
      <HeadlineSm className="text-on-surface mb-1">{title}</HeadlineSm>
      <BodySm className="max-w-md text-secondary mb-space-md">{description}</BodySm>
      {action && <div className="mt-space-xs">{action}</div>}
    </div>
  );
}
