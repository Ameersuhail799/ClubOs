import React from "react";

interface BrandmarkProps {
  className?: string;
  showSubtitle?: boolean;
}

/**
 * ClubOS Tinkers Hub Institutional Brandmark.
 * Defined in DESIGN.md section 3.1.
 */
export function Brandmark({ className = "", showSubtitle = true }: BrandmarkProps) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Compass Geometric Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 28 28"
        width="28"
        height="28"
        fill="none"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <rect
          x="2"
          y="2"
          width="24"
          height="24"
          rx="4"
          stroke="#2C4A3E"
          strokeWidth="2"
          fill="#EEF2EE"
        />
        <circle cx="14" cy="14" r="3.5" fill="#2C4A3E" />
        <line x1="14" y1="6" x2="14" y2="10" stroke="#2C4A3E" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="14" y1="18" x2="14" y2="22" stroke="#2C4A3E" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="10" y1="14" x2="6" y2="14" stroke="#2C4A3E" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="22" y1="14" x2="18" y2="14" stroke="#2C4A3E" strokeWidth="1.75" strokeLinecap="round" />
      </svg>

      {/* Typographic Wordmark */}
      <div className="flex flex-col justify-center leading-none">
        <span className="font-sans font-bold text-[15px] tracking-[-0.02em] text-on-background">
          CLUB<span className="text-primary-container">OS</span>
        </span>
        {showSubtitle && (
          <span className="font-mono text-[8px] font-semibold tracking-[0.08em] text-secondary uppercase">
            Tinkers Hub
          </span>
        )}
      </div>
    </div>
  );
}
