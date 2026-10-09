import React from "react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageContainer } from "@/components/layout/PageContainer";

export default function MembersDirectoryLoading() {
  return (
    <div className="py-8 flex flex-col gap-6 animate-fadeIn">
      <PageContainer>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LoadingSkeleton className="h-4 w-28" />
              <LoadingSkeleton className="h-4 w-36 rounded-full" />
            </div>
            <LoadingSkeleton className="h-8 w-56" />
            <LoadingSkeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex items-center gap-3">
            <LoadingSkeleton className="h-9 w-28 rounded-md" />
            <LoadingSkeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>

        {/* Directory Filters Toolbar */}
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <LoadingSkeleton className="h-8 w-60 rounded-md" />
            <LoadingSkeleton className="h-8 w-32 rounded-md" />
            <LoadingSkeleton className="h-8 w-28 rounded-md" />
          </div>
          <LoadingSkeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Members Directory Ledger Table Skeleton */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant flex items-center justify-between">
            <LoadingSkeleton className="h-5 w-44" />
            <LoadingSkeleton className="h-4 w-28" />
          </div>
          <div className="divide-y divide-outline-variant/60">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 flex-1">
                  <LoadingSkeleton className="h-9 w-9 rounded-full" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <LoadingSkeleton className="h-4 w-36" />
                    <LoadingSkeleton className="h-3 w-48" />
                  </div>
                </div>
                <LoadingSkeleton className="h-5 w-24 rounded-full" />
                <LoadingSkeleton className="h-5 w-20 rounded-full" />
                <LoadingSkeleton className="h-8 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
