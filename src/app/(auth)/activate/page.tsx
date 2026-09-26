import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { getPendingActivationDetails } from "@/lib/invitations/service";
import { ActivateForm } from "./ActivateForm";

export default async function ActivatePage() {
  const details = await getPendingActivationDetails();

  if (details.error === "deactivated") {
    redirect("/account-status?reason=deactivated");
  }

  if (details.error === "revoked") {
    redirect("/account-status?reason=revoked_invitation");
  }

  if (details.error === "expired") {
    redirect("/account-status?reason=expired_invitation");
  }

  if (details.error === "missing_invitation" || details.error === "no_membership") {
    redirect("/account-status?reason=invalid_invitation");
  }

  if (details.error === "already_active") {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div className="flex flex-col gap-1.5">
          <LabelCaps className="text-primary font-bold">Account Active</LabelCaps>
          <HeadlineSm className="text-on-background">Already Activated</HeadlineSm>
          <BodySm className="text-secondary">
            Your institutional account is already fully activated and operational.
          </BodySm>
        </div>

        <Link href="/workspace" className="w-full">
          <Button variant="primary" size="lg" className="w-full">
            Proceed to Workspace
          </Button>
        </Link>
      </div>
    );
  }

  if (details.error === "unauthenticated") {
    return (
      <div className="flex flex-col gap-6 text-left">
        <div className="flex flex-col gap-1.5">
          <LabelCaps className="text-primary font-bold">Institutional Protocol</LabelCaps>
          <HeadlineSm className="text-on-background">Activation Link Required</HeadlineSm>
          <BodySm className="text-secondary leading-relaxed">
            ClubOS accounts are strictly invitation-only. To initiate first-time account activation, please open the personalized link sent directly to your institutional email.
          </BodySm>
        </div>

        <div className="p-4 bg-surface-container-low rounded border border-outline-variant text-body-sm text-secondary">
          If you have already created your password credential, please sign in directly with your institutional email.
        </div>

        <Link href="/login" className="w-full">
          <Button variant="secondary" size="lg" className="w-full">
            Proceed to Sign In
          </Button>
        </Link>

        <div className="pt-4 border-t border-outline-variant text-center">
          <Link href="/" className="text-body-sm text-secondary hover:text-on-surface">
            ← Return to Public Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">First-Time Setup</LabelCaps>
        <HeadlineSm className="text-on-background">Activate Account</HeadlineSm>
        <BodySm className="text-secondary">
          Configure your institutional credentials to finalize membership activation and access your workspace.
        </BodySm>
      </div>

      <ActivateForm
        email={details.email!}
        fullName={details.fullName}
        organizationName={details.organizationName!}
        primaryGroupName={details.primaryGroupName!}
        role={details.role!}
      />

      <div className="pt-4 border-t border-outline-variant text-center">
        <Link href="/login" className="text-body-sm text-secondary hover:text-on-surface">
          ← Return to Sign In
        </Link>
      </div>
    </div>
  );
}
