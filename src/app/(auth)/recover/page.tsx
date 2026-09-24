"use client";

import React from "react";
import Link from "next/link";
import { HeadlineSm, BodySm, LabelCaps } from "@/components/ui/Typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RecoverPage() {
  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">Credential Recovery</LabelCaps>
        <HeadlineSm className="text-on-background">Password Recovery</HeadlineSm>
        <BodySm className="text-secondary">
          Enter your registered institutional email. If verified, an ephemeral recovery token will be dispatched.
        </BodySm>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Institutional Email"
          type="email"
          placeholder="user@tinkershub.org"
          required
        />

        <Link href="/reset-password?token=demo-token" className="w-full mt-2">
          <Button variant="primary" size="lg" className="w-full">
            Dispatch Recovery Token
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
