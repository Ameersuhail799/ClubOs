import React from "react";
import Link from "next/link";
import { Brandmark } from "@/components/brand/Brandmark";
import { LabelCode } from "@/components/ui/Typography";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background p-4 sm:p-6">
      {/* Top Header */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" aria-label="Tinkers Hub Home">
          <Brandmark />
        </Link>
        <Link
          href="/"
          className="text-body-sm text-secondary hover:text-on-surface transition-colors"
        >
          ← Return to Public Site
        </Link>
      </div>

      {/* Centered Auth Card Container */}
      <main className="w-full flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded p-6 sm:p-8 shadow-card flex flex-col gap-6">
          {children}
        </div>
      </main>

      {/* Institutional Security Notice Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-4">
        <LabelCode size="sm" className="text-secondary">
          CLUBOS ACCESS PROTOCOL • ZERO SECRETS POLICY
        </LabelCode>
      </footer>
    </div>
  );
}
