import React from "react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageContainer } from "@/components/layout/PageContainer";

export default function WorkspaceLoading() {
  return (
    <div className="py-8 flex flex-col gap-6 animate-fadeIn">
      <PageContainer>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-2">
            <LoadingSkeleton className="h-4 w-32" />
            <LoadingSkeleton className="h-8 w-56" />
            <LoadingSkeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <LoadingSkeleton className="h-9 w-24 rounded-lg" />
            <LoadingSkeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <LoadingSkeleton className="h-5 w-36" />
            <LoadingSkeleton className="h-10 w-24" />
            <LoadingSkeleton className="h-4 w-full" />
          </div>
          <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <LoadingSkeleton className="h-5 w-36" />
            <LoadingSkeleton className="h-10 w-24" />
            <LoadingSkeleton className="h-4 w-full" />
          </div>
          <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <LoadingSkeleton className="h-5 w-36" />
            <LoadingSkeleton className="h-10 w-24" />
            <LoadingSkeleton className="h-4 w-full" />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
