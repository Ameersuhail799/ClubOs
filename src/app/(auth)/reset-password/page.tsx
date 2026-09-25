"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { resetPasswordAction } from "@/lib/auth/actions";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    null
  );

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">Credential Reset</LabelCaps>
        <HeadlineSm className="text-on-background">Set New Password</HeadlineSm>
        <BodySm className="text-secondary">
          Enter your updated security credential. Once confirmed, you will be redirected to sign in.
        </BodySm>
      </div>

      {state?.error && (
        <div className="p-3 bg-error/10 rounded border border-error/30 text-body-sm text-error">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          name="password"
          label="New Password"
          type="password"
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          required
          disabled={isPending}
        />
        <Input
          name="confirmPassword"
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          required
          disabled={isPending}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          disabled={isPending}
        >
          {isPending ? "Updating Credential..." : "Update Credential & Proceed"}
        </Button>
      </form>

      <div className="pt-4 border-t border-outline-variant text-center">
        <Link href="/login" className="text-body-sm text-secondary hover:text-on-surface">
          ← Return to Sign In
        </Link>
      </div>
    </div>
  );
}
