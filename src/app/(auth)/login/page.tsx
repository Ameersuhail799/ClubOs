"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signInAction } from "@/lib/auth/actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "";
  const message = searchParams.get("message");
  const errorParam = searchParams.get("error");

  const [state, formAction, isPending] = useActionState(signInAction, null);

  const displayError =
    state?.error ||
    (errorParam === "recovery_failed"
      ? "Password recovery link was invalid or has expired."
      : null);

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">Unified Access</LabelCaps>
        <HeadlineSm className="text-on-background">Sign in to ClubOS</HeadlineSm>
        <BodySm className="text-secondary">
          Enter your institutional credentials. Your access scope and functional group are automatically resolved upon sign in.
        </BodySm>
      </div>

      {message === "password_updated" && (
        <div className="p-3 bg-surface-container rounded border border-primary/20 text-body-sm text-primary">
          Password updated successfully. Please sign in with your new credential.
        </div>
      )}

      {displayError && (
        <div className="p-3 bg-error/10 rounded border border-error/30 text-body-sm text-error">
          {displayError}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <Input
          name="email"
          label="Institutional Email"
          type="email"
          placeholder="user@tinkershub.org"
          autoComplete="email"
          required
          disabled={isPending}
        />

        <div className="flex flex-col gap-1">
          <Input
            name="password"
            label="Password"
            type="password"
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
            disabled={isPending}
          />
          <div className="flex justify-end pt-1">
            <Link
              href="/recover"
              className="text-[12px] font-sans text-secondary hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          disabled={isPending}
        >
          {isPending ? "Authenticating..." : "Sign In to Workspace"}
        </Button>
      </form>

      <div className="pt-4 border-t border-outline-variant flex flex-col gap-3">
        <div className="flex items-center justify-between text-body-sm">
          <span className="text-secondary">First-time account?</span>
          <Link
            href="/activate"
            className="text-primary hover:underline font-medium font-sans"
          >
            Activate Account →
          </Link>
        </div>
      </div>
    </div>
  );
}
