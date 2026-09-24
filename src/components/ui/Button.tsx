import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-sans font-medium select-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded";

    const variants = {
      primary:
        "bg-primary text-on-primary hover:bg-primary-container active:bg-primary border border-transparent shadow-subtle",
      secondary:
        "bg-surface-container text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest border border-outline-variant",
      outline:
        "bg-transparent text-on-surface hover:bg-surface-container-low active:bg-surface-container border border-outline-variant",
      ghost:
        "bg-transparent text-secondary hover:text-on-surface hover:bg-surface-container-low active:bg-surface-container border border-transparent",
      danger:
        "bg-error text-on-error hover:bg-opacity-90 active:bg-opacity-100 border border-transparent shadow-subtle",
    };

    const sizes = {
      sm: "h-7 px-2.5 text-body-sm gap-1.5",
      md: "h-9 px-3.5 text-body-md gap-2",
      lg: "h-11 px-5 text-body-md font-semibold gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
