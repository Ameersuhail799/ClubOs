"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { recoverPasswordAction } from "@/lib/auth/actions";

export default function RecoverPage() {
  const [state, formAction, isPending] = useActionState(
    recoverPasswordAction,
    null
  );

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">Credential Recovery</LabelCaps>
        <HeadlineSm className="text-on-background">Password Recovery</HeadlineSm>
        <BodySm className="text-secondary">
          Enter your registered institutional email. If verified, an ephemeral recovery instruction will be dispatched.
        </BodySm>
      </div>

      {state?.error && (
        <div className="p-3 bg-error/10 rounded border border-error/30 text-body-sm text-error">
          {state.error}
        </div>
      )}

      {state?.success ? (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-surface-container rounded border border-outline-variant text-body-sm text-on-surface">
            {state.message}
          </div>
          <Link href="/login" className="w-full">
            <Button variant="secondary" size="lg" className="w-full">
              Return to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            name="email"
            label="Institutional Email"
            type="email"
            placeholder="user@tinkershub.org"
            autoComplete="email"
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
            {isPending ? "Dispatching..." : "Dispatch Recovery Instructions"}
          </Button>
        </form>
      )}

      <div className="pt-4 border-t border-outline-variant text-center">
        <Link href="/login" className="text-body-sm text-secondary hover:text-on-surface">
          ← Return to Sign In
        </Link>
      </div>
    </div>
  );
}
