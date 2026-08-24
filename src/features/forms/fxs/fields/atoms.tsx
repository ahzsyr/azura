"use client";

import { cn } from "@/lib/utils";

export function FxsLabel({
  htmlFor,
  children,
  className,
  floating,
  active,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  floating?: boolean;
  active?: boolean;
}) {
  if (floating) {
    return (
      <label
        htmlFor={htmlFor}
        className={cn(
          "pointer-events-none absolute start-3 z-10 origin-top-left bg-transparent px-0.5 text-muted-foreground transition-all",
          active
            ? "top-1.5 text-[10px] font-medium uppercase tracking-wide"
            : "top-1/2 -translate-y-1/2 text-sm",
          className,
        )}
        style={{ transitionDuration: "var(--fxs-motion, 160ms)" }}
      >
        {children}
      </label>
    );
  }
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-medium leading-none text-foreground", className)}
    >
      {children}
    </label>
  );
}

export function FxsHint({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p id={id} className={cn("text-xs text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function RequiredBadge({ optional }: { optional?: boolean }) {
  if (optional) {
    return (
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Optional
      </span>
    );
  }
  return (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  );
}

export function ValidationMessage({
  id,
  error,
  success,
  className,
}: {
  id?: string;
  error?: string | null;
  success?: string | null;
  className?: string;
}) {
  if (error) {
    return (
      <p
        id={id}
        role="alert"
        className={cn("text-xs text-[var(--fxs-danger,var(--destructive))]", className)}
      >
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p id={id} className={cn("text-xs text-[var(--fxs-success,var(--primary))]", className)}>
        {success}
      </p>
    );
  }
  return null;
}
