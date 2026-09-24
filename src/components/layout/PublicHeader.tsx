"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Brandmark } from "@/components/brand/Brandmark";
import { Button } from "@/components/ui/Button";

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded py-1"
          aria-label="Tinkers Hub Home"
        >
          <Brandmark />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Public Navigation">
          <Link
            href="/"
            className="text-body-sm font-medium text-on-surface hover:text-primary transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            Home
          </Link>
          <Link
            href="/events"
            className="text-body-sm font-medium text-on-surface hover:text-primary transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            Events & Workshops
          </Link>
          <div className="h-4 w-[1px] bg-outline-variant" />
          <Link href="/login">
            <Button variant="primary" size="sm">
              Sign In to ClubOS
            </Button>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded text-secondary hover:text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-outline-variant bg-surface-container-low px-4 py-3 flex flex-col gap-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2 rounded text-body-md font-medium text-on-surface hover:bg-surface-container"
          >
            Home
          </Link>
          <Link
            href="/events"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2 rounded text-body-md font-medium text-on-surface hover:bg-surface-container"
          >
            Events & Workshops
          </Link>
          <div className="pt-2 border-t border-outline-variant">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" className="w-full">
                Sign In to ClubOS
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
