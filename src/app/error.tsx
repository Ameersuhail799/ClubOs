"use client";

import React, { useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodySm, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors securely without sensitive leakage
    console.error("[ClubOS Error Boundary]:", error.message);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <PageContainer size="narrow" className="text-center flex flex-col items-center gap-4">
        <LabelCode size="md" className="text-error">
          SYSTEM FAULT • EXECUTION ERROR
        </LabelCode>
        <HeadlineMd>An Unexpected Fault Occurred</HeadlineMd>
        <BodySm className="max-w-md text-secondary">
          The operational interface encountered an unhandled exception. State has been contained.
        </BodySm>
        <div className="pt-2 flex items-center gap-3">
          <Button variant="primary" size="md" onClick={() => reset()}>
            Retry Operation
          </Button>
          <Button variant="outline" size="md" onClick={() => (window.location.href = "/")}>
            Return Home
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}
