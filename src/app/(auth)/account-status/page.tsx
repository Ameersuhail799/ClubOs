"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

export default function AccountStatusPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "pending";

  const statusConfigs: Record<
    string,
    { badge: string; title: string; description: string }
  > = {
    pending: {
      badge: "Account Pending",
      title: "Pending Activation",
      description:
        "Your account credentials exist, but your organization membership is currently pending activation by an institutional Main Head. Normal workspace access is restricted until activated.",
    },
    deactivated: {
      badge: "Access Suspended",
      title: "Account Deactivated",
      description:
        "Your institutional access has been deactivated. Historical records remain preserved, but active workspace operations are unavailable. Please contact your organization administrator.",
    },
    no_membership: {
      badge: "No Membership",
      title: "Organization Not Found",
      description:
        "Your authenticated account is not associated with an active ClubOS organization. ClubOS is strictly invitation-only; please ensure you used your institutional invitation token.",
    },
  };

  const currentConfig = statusConfigs[reason] || statusConfigs.pending;

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-secondary font-bold">
          {currentConfig.badge}
        </LabelCaps>
        <HeadlineSm className="text-on-background">
          {currentConfig.title}
        </HeadlineSm>
        <BodySm className="text-secondary leading-relaxed">
          {currentConfig.description}
        </BodySm>
      </div>

      <div className="p-4 bg-surface-container-low rounded border border-outline-variant text-body-sm text-secondary">
        Security Note: Direct workspace URL bypass is blocked at the server boundary. You must possess an active institutional role to enter.
      </div>

      <form action="/auth/signout" method="POST" className="w-full">
        <Button variant="secondary" size="lg" className="w-full">
          Sign Out of This Account
        </Button>
      </form>

      <div className="pt-4 border-t border-outline-variant text-center">
        <Link
          href="/"
          className="text-body-sm text-secondary hover:text-on-surface"
        >
          ← Return to Public Homepage
        </Link>
      </div>
    </div>
  );
}
