"use client";

import React, { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { activateAccountAction } from "@/lib/invitations/actions";

interface ActivateFormProps {
  email: string;
  fullName?: string;
  organizationName: string;
  primaryGroupName: string;
  role: string;
}

export function ActivateForm({
  email,
  fullName,
  organizationName,
  primaryGroupName,
  role,
}: ActivateFormProps) {
  const [state, formAction, isPending] = useActionState(
    activateAccountAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <div className="p-3 bg-error/10 rounded border border-error/30 text-body-sm text-error">
          {state.error}
        </div>
      )}

      {/* Read-Only Institutional Metadata */}
      <div className="p-3.5 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-2">
        <div className="flex flex-col">
          <span className="text-[11px] font-mono uppercase tracking-wider text-secondary">
            Activating Account
          </span>
          <span className="text-body-sm font-semibold text-on-surface">
            {fullName ? `${fullName} (${email})` : email}
          </span>
        </div>

        <div className="h-[1px] bg-outline-variant my-0.5" />

        <div className="grid grid-cols-2 gap-2 text-body-xs">
          <div>
            <span className="text-secondary block">Organization:</span>
            <span className="font-medium text-on-surface">{organizationName}</span>
          </div>
          <div>
            <span className="text-secondary block">Assigned Group:</span>
            <span className="font-medium text-on-surface">{primaryGroupName}</span>
          </div>
          <div className="col-span-2">
            <span className="text-secondary block">Institutional Role:</span>
            <span className="font-mono uppercase font-semibold text-primary">
              {role.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Password Creation */}
      <div className="flex flex-col gap-1">
        <Input
          name="password"
          label="Set Password"
          type="password"
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          required
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Input
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          required
          disabled={isPending}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full mt-2"
        disabled={isPending}
      >
        {isPending ? "Activating Membership..." : "Complete Activation & Enter Workspace"}
      </Button>
    </form>
  );
}
