import { redirect } from "next/navigation";
import { getCurrentOrganizationContext } from "@/lib/auth/context";
import { getWorkboardData } from "@/lib/tasks/service";
import { WorkboardContent } from "@/components/workboard/WorkboardContent";

export const dynamic = "force-dynamic";

export default async function WorkboardPage() {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user) {
    redirect("/login");
  }

  if (context.status !== "active") {
    redirect("/account-status");
  }

  const result = await getWorkboardData();

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant p-6 rounded-xl text-center flex flex-col gap-3">
          <h2 className="text-lg font-bold text-on-surface">Unable to load Workboard</h2>
          <p className="text-sm text-secondary">
            {result.error || "An error occurred while loading institutional task records."}
          </p>
          <a
            href="/workspace"
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Return to Workspace
          </a>
        </div>
      </div>
    );
  }

  return (
    <WorkboardContent
      initialData={result.data}
      organizationName={context.organization?.name}
      primaryGroupName={context.primaryGroup?.name}
    />
  );
}
