"use client";

import type { SeoScoreResult } from "@/features/seo/scoring/seo-scoring.service";
import { cn } from "@/lib/utils";

type Props = {
  result: SeoScoreResult;
};

const gradeStyles = {
  good: "text-emerald-600 bg-emerald-50 border-emerald-200",
  fair: "text-amber-700 bg-amber-50 border-amber-200",
  poor: "text-red-700 bg-red-50 border-red-200",
};

export function SeoAnalysisPanel({ result }: Props) {
  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border px-4 py-3 flex items-center justify-between", gradeStyles[result.grade])}>
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold opacity-80">Page SEO score</p>
          <p className="text-2xl font-bold">{result.score}/100</p>
        </div>
        <span className="text-sm font-medium capitalize">{result.grade}</span>
      </div>
      <ul className="space-y-2">
        {result.checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
              check.passed ? "border-emerald-200/60 bg-emerald-50/40" : "border-border bg-muted/30"
            )}
          >
            <span className={check.passed ? "text-emerald-600" : "text-muted-foreground"} aria-hidden>
              {check.passed ? "✓" : "○"}
            </span>
            <div>
              <p className="font-medium">{check.label}</p>
              {check.message && <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
