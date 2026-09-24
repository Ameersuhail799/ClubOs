import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageContainer } from "@/components/layout/PageContainer";

export default function Loading() {
  return (
    <PageContainer className="py-12 flex flex-col gap-6">
      <LoadingSkeleton className="h-8 w-48" />
      <LoadingSkeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LoadingSkeleton className="h-40 w-full" />
        <LoadingSkeleton className="h-40 w-full" />
        <LoadingSkeleton className="h-40 w-full" />
      </div>
    </PageContainer>
  );
}
