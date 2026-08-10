"use client";

import { cn } from "@/lib/utils";

export function HelpFlowDiagram({ steps, className }: { steps: string[]; className?: string }) {
  return (
    <ol
      className={cn(
        "flex flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2",
        className
      )}
    >
      {steps.map((step, index) => (
        <li key={`${step}-${index}`} className="flex flex-col items-start sm:flex-row sm:items-center">
          <span className="rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm">
            {step}
          </span>
          {index < steps.length - 1 && (
            <>
              <span className="ms-4 py-1 text-muted-foreground sm:hidden" aria-hidden>
                ↓
              </span>
              <span className="mx-1 hidden text-muted-foreground sm:inline" aria-hidden>
                →
              </span>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
