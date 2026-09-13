"use client";

import { cn } from "@/lib/utils";
import type { FxsProgressStyle } from "../types";
import { prefersReducedMotion } from "../a11y/motion";

export function FormProgress({
  step,
  total,
  labels,
  style = "bar",
  className,
}: {
  step: number;
  total: number;
  labels?: string[];
  style?: FxsProgressStyle;
  className?: string;
}) {
  const progress = total > 0 ? ((step + 1) / total) * 100 : 100;
  const reduced = prefersReducedMotion();

  if (total <= 1) return null;

  if (style === "dots") {
    return (
      <div className={cn("flex items-center gap-1.5", className)} role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn("h-2 w-2 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
            style={{ transitionDuration: reduced ? "0ms" : "var(--fxs-motion, 160ms)" }}
          />
        ))}
      </div>
    );
  }

  if (style === "steps" || style === "breadcrumb") {
    return (
      <ol className={cn("flex flex-wrap gap-2", className)} aria-label="Form progress">
        {Array.from({ length: total }).map((_, i) => (
          <li
            key={i}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium",
              i === step
                ? "border-primary/40 bg-primary/5 text-foreground"
                : i < step
                  ? "border-border bg-muted/40 text-muted-foreground"
                  : "border-transparent text-muted-foreground",
            )}
          >
            {labels?.[i] ?? `Step ${i + 1}`}
          </li>
        ))}
      </ol>
    );
  }

  if (style === "sidebar") {
    return (
      <nav className={cn("hidden space-y-2 lg:block", className)} aria-label="Form steps">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              i === step ? "border-primary/40 bg-primary/5 font-medium" : "border-transparent text-muted-foreground",
            )}
          >
            {labels?.[i] ?? `Step ${i + 1}`}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Step {step + 1} of {total}
        </span>
        <span className="tabular-nums">{Math.round(progress)}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${progress}%`,
            transition: reduced ? "none" : "width var(--fxs-motion, 160ms) ease",
          }}
        />
      </div>
    </div>
  );
}
