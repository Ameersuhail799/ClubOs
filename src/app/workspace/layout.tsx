import React from "react";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <WorkspaceHeader />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
