"use client";

import { cn } from "@/lib/utils";
import type { FxsSummaryItem } from "../types";

export function LiveSummary({
  title = "Inquiry summary",
  items,
  footer,
  className,
}: {
  title?: string;
  items: FxsSummaryItem[];
  footer?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "rounded-[var(--schema-radius-lg)] border border-border/70 bg-[var(--fxs-surface)] p-4 shadow-[var(--fxs-elev-sm)]",
        className,
      )}
      aria-live="polite"
      aria-atomic="false"
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="grid gap-0.5">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</dt>
            <dd className="truncate text-sm font-medium text-foreground">{item.value || "—"}</dd>
          </div>
        ))}
      </dl>
      {footer ? <p className="mt-4 text-xs text-muted-foreground">{footer}</p> : null}
    </aside>
  );
}
