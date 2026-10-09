import React from "react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageContainer } from "@/components/layout/PageContainer";

export default function WorkboardLoading() {
  return (
    <div className="py-8 flex flex-col gap-6 animate-fadeIn">
      <PageContainer>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LoadingSkeleton className="h-4 w-28" />
              <LoadingSkeleton className="h-4 w-44 rounded-full" />
            </div>
            <LoadingSkeleton className="h-8 w-44" />
            <LoadingSkeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex items-center gap-2.5">
            <LoadingSkeleton className="h-8 w-28 rounded-md" />
            <LoadingSkeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <LoadingSkeleton className="h-8 w-48 rounded-md" />
            <LoadingSkeleton className="h-8 w-32 rounded-md" />
            <LoadingSkeleton className="h-8 w-28 rounded-md" />
            <LoadingSkeleton className="h-8 w-36 rounded-md" />
          </div>
          <LoadingSkeleton className="h-8 w-28 rounded-md" />
        </div>

        {/* Board Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {["Assigned", "In Progress", "Review", "Completed"].map((col, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-3 p-3.5 rounded-xl bg-surface-container-low/40 border border-outline-variant/60 min-h-[450px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                <LoadingSkeleton className="h-4 w-24" />
                <LoadingSkeleton className="h-4 w-6 rounded-full" />
              </div>
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3].map((card) => (
                  <div
                    key={card}
                    className="p-3.5 rounded-lg border border-outline-variant bg-surface-container-lowest flex flex-col gap-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <LoadingSkeleton className="h-3 w-16" />
                      <LoadingSkeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <LoadingSkeleton className="h-4 w-full" />
                    <LoadingSkeleton className="h-3 w-3/4" />
                    <div className="pt-2 flex items-center justify-between border-t border-outline-variant/30">
                      <LoadingSkeleton className="h-3 w-20" />
                      <LoadingSkeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
