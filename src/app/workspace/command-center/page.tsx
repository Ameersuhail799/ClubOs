import React from "react";
import { redirect } from "next/navigation";
import { getCurrentOrganizationContext, getRoleDefaultPath } from "@/lib/auth/context";
import { getTaskCreationContext, getOrganizationDirectives } from "@/lib/tasks/service";
import { CommandCenterContent } from "@/components/command-center/CommandCenterContent";

export default async function CommandCenterPage() {
  const context = await getCurrentOrganizationContext();

  // Strict role boundary: Only Main Head can access Command Center
  if (context.role !== "main_head") {
    redirect(getRoleDefaultPath(context.role || "member"));
  }

  // Load task creation context (groups & eligible active Group Heads)
  const [creationContextRes, directivesRes] = await Promise.all([
    getTaskCreationContext(),
    getOrganizationDirectives(),
  ]);

  const initialGroups = creationContextRes.data?.groups || [];
  const initialGroupHeads = creationContextRes.data?.groupHeads || [];
  const initialDirectives = directivesRes.data || [];

  return (
    <CommandCenterContent
      initialGroups={initialGroups}
      initialGroupHeads={initialGroupHeads}
      initialDirectives={initialDirectives}
    />
  );
}
