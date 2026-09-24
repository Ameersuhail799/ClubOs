import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label htmlFor={inputId} className="font-sans text-label-caps uppercase text-secondary font-semibold">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            "w-full h-9 px-3 rounded bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface placeholder:text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50 disabled:bg-surface-container-low transition-colors duration-150",
            error && "border-error focus-visible:ring-error focus-visible:border-error",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <span className="font-sans text-[11px] text-secondary leading-tight">{hint}</span>
        )}
        {error && (
          <span className="font-sans text-[11px] text-error font-medium leading-tight">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
