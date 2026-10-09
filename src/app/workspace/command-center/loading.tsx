import React from "react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageContainer } from "@/components/layout/PageContainer";

export default function CommandCenterLoading() {
  return (
    <div className="py-8 flex flex-col gap-8 animate-fadeIn">
      <PageContainer>
        {/* Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LoadingSkeleton className="h-4 w-24" />
              <LoadingSkeleton className="h-4 w-32 rounded-full" />
            </div>
            <LoadingSkeleton className="h-8 w-56" />
            <LoadingSkeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex items-center gap-3">
            <LoadingSkeleton className="h-8 w-24 rounded-md" />
            <LoadingSkeleton className="h-8 w-28 rounded-md" />
            <LoadingSkeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>

        {/* 5 Functional Groups Locked Blueprint Grid */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <LoadingSkeleton className="h-4 w-64" />
            <LoadingSkeleton className="h-4 w-44" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((g) => (
              <div
                key={g}
                className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col justify-between gap-3 min-h-[110px]"
              >
                <div className="flex flex-col gap-2">
                  <LoadingSkeleton className="h-3 w-12" />
                  <LoadingSkeleton className="h-5 w-28" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
                  <LoadingSkeleton className="h-3 w-16" />
                  <LoadingSkeleton className="h-4 w-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Directives Ledger Table Skeleton */}
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between">
            <LoadingSkeleton className="h-5 w-48" />
            <LoadingSkeleton className="h-4 w-28" />
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
            <div className="p-3.5 bg-surface-container-low/50 border-b border-outline-variant flex items-center justify-between">
              <LoadingSkeleton className="h-4 w-36" />
              <LoadingSkeleton className="h-4 w-24" />
            </div>
            <div className="divide-y divide-outline-variant/60">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <LoadingSkeleton className="h-4 w-20" />
                    <LoadingSkeleton className="h-5 w-64" />
                  </div>
                  <LoadingSkeleton className="h-5 w-24 rounded-full" />
                  <LoadingSkeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
