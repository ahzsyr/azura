"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { MenuHealthIssue } from "@/features/navigation/menu-validation-service";

type Props = {
  issues: MenuHealthIssue[];
  onGoToItem: (itemId: string) => void;
};

export function MenuHealthPanel({ issues, onGoToItem }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Menu Health</p>
        <p className="text-xs text-muted-foreground">Real-time diagnostics and validation.</p>
      </div>
      {issues.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          No issues detected.
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <button
              key={issue.key}
              type="button"
              className="flex w-full items-start gap-2 rounded-md border p-2 text-left text-sm"
              onClick={() => issue.itemId && onGoToItem(issue.itemId)}
            >
              <AlertTriangle
                className={
                  issue.severity === "error"
                    ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                    : "mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                }
              />
              <span>{issue.message}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
