import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCode } from "@/components/ui/Typography";

export function TaskNotFound() {
  return (
    <div className="py-12 flex flex-col items-center">
      <PageContainer>
        <div className="max-w-xl mx-auto p-8 rounded bg-surface-container-lowest border border-outline-variant text-center flex flex-col items-center gap-4">
          <LabelCode size="sm" className="text-secondary font-bold uppercase tracking-wider">
            STATUS 404 • RECORD UNRESOLVED
          </LabelCode>
          <HeadlineMd className="text-on-surface">Task Directive Not Found</HeadlineMd>
          <BodyMd className="text-secondary">
            The requested task record does not exist in your organization or has been permanently removed.
          </BodyMd>
          <Link
            href="/workspace"
            className="mt-2 inline-flex items-center justify-center font-sans font-medium h-9 px-4 rounded bg-primary text-on-primary hover:bg-primary-container transition-colors text-body-sm"
          >
            Return to Workspace
          </Link>
        </div>
      </PageContainer>
    </div>
  );
}

export function TaskForbidden() {
  return (
    <div className="py-12 flex flex-col items-center">
      <PageContainer>
        <div className="max-w-xl mx-auto p-8 rounded bg-surface-container-lowest border border-error/20 text-center flex flex-col items-center gap-4">
          <LabelCode size="sm" className="text-error font-bold uppercase tracking-wider">
            STATUS 403 • ACCESS RESTRICTED
          </LabelCode>
          <HeadlineMd className="text-on-surface">Access Denied</HeadlineMd>
          <BodyMd className="text-secondary">
            You do not have institutional authorization or explicit collaboration access to inspect this task directive.
          </BodyMd>
          <Link
            href="/workspace"
            className="mt-2 inline-flex items-center justify-center font-sans font-medium h-9 px-4 rounded bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors text-body-sm"
          >
            Return to Workspace
          </Link>
        </div>
      </PageContainer>
    </div>
  );
}
