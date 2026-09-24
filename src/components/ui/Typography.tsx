import React from "react";
import { cn } from "@/lib/utils";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function Display({ children, className, as: Component = "h1", ...props }: TypographyProps) {
  return (
    <Component className={cn("font-sans text-display-lg text-on-background font-semibold tracking-tight", className)} {...props}>
      {children}
    </Component>
  );
}

export function HeadlineMd({ children, className, as: Component = "h2", ...props }: TypographyProps) {
  return (
    <Component className={cn("font-sans text-headline-md text-on-background font-semibold tracking-tight", className)} {...props}>
      {children}
    </Component>
  );
}

export function HeadlineSm({ children, className, as: Component = "h3", ...props }: TypographyProps) {
  return (
    <Component className={cn("font-sans text-headline-sm text-on-background font-semibold tracking-tight", className)} {...props}>
      {children}
    </Component>
  );
}

export function BodyLg({ children, className, as: Component = "p", ...props }: TypographyProps) {
  return (
    <Component className={cn("font-sans text-body-lg text-on-surface", className)} {...props}>
      {children}
    </Component>
  );
}

export function BodyMd({ children, className, as: Component = "p", ...props }: TypographyProps) {
  return (
    <Component className={cn("font-sans text-body-md text-on-surface", className)} {...props}>
      {children}
    </Component>
  );
}

export function BodySm({ children, className, as: Component = "p", ...props }: TypographyProps) {
  return (
    <Component className={cn("font-sans text-body-sm text-on-surface-variant", className)} {...props}>
      {children}
    </Component>
  );
}

export function LabelCaps({ children, className, as: Component = "span", ...props }: TypographyProps) {
  return (
    <Component className={cn("font-sans text-label-caps uppercase tracking-wider text-secondary font-semibold", className)} {...props}>
      {children}
    </Component>
  );
}

export function LabelCode({ children, className, size = "md", as: Component = "span", ...props }: TypographyProps & { size?: "sm" | "md" }) {
  return (
    <Component
      className={cn(
        "font-mono font-medium",
        size === "sm" ? "text-label-code-sm" : "text-label-code-md",
        "text-on-surface-variant",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
