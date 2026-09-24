"use client";

import React from "react";
import Link from "next/link";
import { HeadlineSm, BodySm, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-1.5">
        <LabelCaps className="text-primary font-bold">Unified Access</LabelCaps>
        <HeadlineSm className="text-on-background">Sign in to ClubOS</HeadlineSm>
        <BodySm className="text-secondary">
          Enter your institutional credentials. Your access scope and functional group are automatically resolved upon sign in.
        </BodySm>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Institutional Email"
          type="email"
          placeholder="user@tinkershub.org"
          autoComplete="email"
          required
        />
        <div className="flex flex-col gap-1">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
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

        <Link href="/workspace/command-center" className="w-full mt-2">
          <Button variant="primary" size="lg" className="w-full">
            Sign In to Workspace
          </Button>
        </Link>
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

        {/* Temporary Build 01 Quick Navigation Guide */}
        <div className="p-3 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-1.5">
          <LabelCode size="sm" className="text-secondary font-semibold">
            BUILD 01 • PROTOTYPE SHELL NAVIGATOR:
          </LabelCode>
          <div className="flex flex-wrap gap-2 text-label-code-sm">
            <Link href="/workspace/command-center" className="text-primary hover:underline">
              [Main Head]
            </Link>
            <Link href="/workspace/group" className="text-primary hover:underline">
              [Group Head]
            </Link>
            <Link href="/workspace/my-day" className="text-primary hover:underline">
              [Member]
            </Link>
            <Link href="/workspace/admin/members" className="text-primary hover:underline">
              [Admin]
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
