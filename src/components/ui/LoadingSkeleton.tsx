import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function LoadingSkeleton({ className, ...props }: LoadingSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded bg-surface-container animate-pulse duration-1000",
        className
      )}
      {...props}
    />
  );
}
