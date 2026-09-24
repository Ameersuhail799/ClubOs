import React from "react";
import Link from "next/link";
import { Brandmark } from "@/components/brand/Brandmark";
import { BodySm, LabelCode } from "@/components/ui/Typography";

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-low/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Brandmark />
          <BodySm className="max-w-md text-secondary">
            Autonomous engineering curiosity, hardware prototyping, and shared institutional ownership at Tinkers Hub.
          </BodySm>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-body-sm text-secondary">
          <Link href="/" className="hover:text-on-surface transition-colors">
            Home
          </Link>
          <Link href="/events" className="hover:text-on-surface transition-colors">
            Events Archive
          </Link>
          <Link href="/login" className="hover:text-primary transition-colors font-medium">
            Internal ClubOS Portal
          </Link>
          <span className="text-outline-variant">|</span>
          <LabelCode size="sm" className="text-secondary">
            BUILD 01 • PROD FOUNDATION
          </LabelCode>
        </div>
      </div>
    </footer>
  );
}
