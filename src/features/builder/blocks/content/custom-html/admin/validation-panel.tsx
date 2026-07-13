"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import type { ValidationWarning } from "../validate";

type Props = {
  warnings: ValidationWarning[];
};

export function ValidationPanel({ warnings }: Props) {
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        {warnings.length} HTML {warnings.length === 1 ? "warning" : "warnings"}
      </p>
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          {w.severity === "error" ? (
            <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <span className="text-foreground/80">
            <span className="font-mono text-[10px] bg-muted px-1 rounded mr-1">&lt;{w.tag}&gt;</span>
            {w.message}
          </span>
        </div>
      ))}
    </div>
  );
}
