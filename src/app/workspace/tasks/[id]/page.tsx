import React from "react";
import { redirect } from "next/navigation";
import { getTaskFullDetails } from "@/lib/tasks/service";
import { TaskInspector } from "@/components/tasks/TaskInspector";
import { TaskNotFound, TaskForbidden } from "@/components/tasks/TaskNotFound";

interface TaskInspectorPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TaskInspectorPage({ params }: TaskInspectorPageProps) {
  const { id } = await params;

  // 1. Guard against malformed or non-UUID inputs safely
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return <TaskNotFound />;
  }

  // 2. Fetch full task details with authoritative server-side authorization
  const result = await getTaskFullDetails(id);

  if (!result.success || !result.data) {
    if (result.code === "unauthorized") {
      redirect("/login");
    }

    if (result.code === "forbidden") {
      return <TaskForbidden />;
    }

    // Default to TaskNotFound (prevents leaking existence of cross-organization tasks)
    return <TaskNotFound />;
  }

  // 3. Render real task inspector with server-verified data
  return <TaskInspector task={result.data} />;
}
