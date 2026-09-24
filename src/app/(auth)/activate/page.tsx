"use client";

import React from "react";
import Link from "next/link";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ActivatePage() {
  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">First-Time Setup</LabelCaps>
        <HeadlineSm className="text-on-background">Activate Account</HeadlineSm>
        <BodySm className="text-secondary">
          Enter the activation token dispatched by your Main Head to initialize your institutional profile and set your key credential.
        </BodySm>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Activation Token or Passcode"
          type="text"
          placeholder="e.g. ACT-9842-X7"
          required
        />
        <Input
          label="Set Password"
          type="password"
          placeholder="Minimum 10 characters"
          required
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          required
        />

        <Link href="/login" className="w-full mt-2">
          <Button variant="primary" size="lg" className="w-full">
            Complete Activation & Sign In
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
