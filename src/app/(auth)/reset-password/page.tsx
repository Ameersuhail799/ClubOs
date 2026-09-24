"use client";

import React from "react";
import Link from "next/link";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">Credential Reset</LabelCaps>
        <HeadlineSm className="text-on-background">Set New Password</HeadlineSm>
        <BodySm className="text-secondary">
          Enter your updated security credential. Once confirmed, all previous sessions will be invalidated.
        </BodySm>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="New Password"
          type="password"
          placeholder="Minimum 10 characters"
          required
        />
        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter password"
          required
        />

        <Link href="/login" className="w-full mt-2">
          <Button variant="primary" size="lg" className="w-full">
            Update Credential & Sign In
          </Button>
        </Link>
      </form>

      <div className="pt-4 border-t border-outline-variant text-center">
        <Link href="/login" className="text-body-sm text-secondary hover:text-on-surface">
          ← Return to Sign In
        </Link>
      </div>
    </div>
  );
}
