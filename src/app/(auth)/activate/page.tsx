"use client";

import React from "react";
import Link from "next/link";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

export default function ActivatePage() {
  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">Controlled Lifecycle</LabelCaps>
        <HeadlineSm className="text-on-background">Account Activation</HeadlineSm>
        <BodySm className="text-secondary leading-relaxed">
          ClubOS accounts are strictly invitation-only. Public self-registration is disabled under institutional access policies.
        </BodySm>
      </div>

      <div className="p-4 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-2">
        <span className="text-body-sm font-semibold text-on-surface">
          Institutional Invitation Required
        </span>
        <p className="text-body-sm text-secondary leading-relaxed">
          To activate your membership, you must click the personalized invitation link sent directly to your institutional email by your organization&apos;s Main Head.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/login" className="w-full">
          <Button variant="primary" size="lg" className="w-full">
            Return to Institutional Sign In
          </Button>
        </Link>
      </div>

      <div className="pt-4 border-t border-outline-variant text-center">
        <Link href="/" className="text-body-sm text-secondary hover:text-on-surface">
          ← Return to Public Site
        </Link>
      </div>
    </div>
  );
}
