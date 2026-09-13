"use client";

import { Card } from "@/components/ui/card";
import type { FormHealthReport } from "@/features/forms/lib/form-health-score";

export function FormHealthScorePanel({
  report,
  onIssueClick,
}: {
  report: FormHealthReport;
  onIssueClick?: (bindingId?: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {report.dimensions.map((d) => (
          <Card key={d.id} className="p-3">
            <p className="text-xs text-muted-foreground">{d.label}</p>
            <p className="text-2xl font-semibold tabular-nums">{d.score}</p>
            <p className="text-xs text-muted-foreground">{d.detail}</p>
          </Card>
        ))}
      </div>
      {report.issues.length > 0 && (
        <Card className="p-3 space-y-1">
          <p className="text-sm font-medium">Issues</p>
          {report.issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              className="block w-full text-left text-sm hover:underline"
              onClick={() => onIssueClick?.(issue.bindingId)}
            >
              <span className={issue.severity === "error" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}>
                ⚠ {issue.message}
              </span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
