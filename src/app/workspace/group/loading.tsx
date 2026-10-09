import React from "react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageContainer } from "@/components/layout/PageContainer";

export default function GroupWorkspaceLoading() {
  return (
    <div className="py-8 flex flex-col gap-8 animate-fadeIn">
      <PageContainer>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LoadingSkeleton className="h-4 w-28" />
              <LoadingSkeleton className="h-4 w-36 rounded-full" />
            </div>
            <LoadingSkeleton className="h-8 w-52" />
            <LoadingSkeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex items-center gap-2.5">
            <LoadingSkeleton className="h-8 w-24 rounded-md" />
            <LoadingSkeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>

        {/* Group Stats & Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <LoadingSkeleton className="h-4 w-28" />
            <LoadingSkeleton className="h-8 w-16" />
            <LoadingSkeleton className="h-3 w-40" />
          </div>
          <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <LoadingSkeleton className="h-4 w-28" />
            <LoadingSkeleton className="h-8 w-16" />
            <LoadingSkeleton className="h-3 w-40" />
          </div>
          <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <LoadingSkeleton className="h-4 w-28" />
            <LoadingSkeleton className="h-8 w-16" />
            <LoadingSkeleton className="h-3 w-40" />
          </div>
        </div>

        {/* Group Deliverables Table Skeleton */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div className="p-4 bg-surface-container-low/40 border-b border-outline-variant flex items-center justify-between">
            <LoadingSkeleton className="h-5 w-40" />
            <LoadingSkeleton className="h-4 w-24" />
          </div>
          <div className="divide-y divide-outline-variant/60">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <LoadingSkeleton className="h-4 w-16" />
                  <LoadingSkeleton className="h-5 w-72" />
                </div>
                <LoadingSkeleton className="h-5 w-20 rounded-full" />
                <LoadingSkeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
