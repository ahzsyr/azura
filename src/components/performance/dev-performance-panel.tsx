"use client";

import { useState } from "react";
import { PerformanceDashboardClient } from "./performance-dashboard-client";
import { cn } from "@/lib/utils";

/** Collapsible dev-only performance panel (storefront). */
export function DevPerformancePanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 end-4 z-[99990] max-w-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm"
      >
        {open ? "Hide perf" : "Perf"}
      </button>
      {open ? (
        <div
          className={cn(
            "mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur-sm",
          )}
        >
          <PerformanceDashboardClient variant="dev" />
        </div>
      ) : null}
    </div>
  );
}
