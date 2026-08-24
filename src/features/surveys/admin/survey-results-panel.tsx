"use client";

import { Card } from "@/components/ui/card";
import type { SurveyResultsSummary } from "@/features/surveys/survey-results.service";

export function SurveyResultsPanel({ results }: { results: SurveyResultsSummary }) {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-medium text-sm">Survey results</h3>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Submissions</p>
          <p className="font-medium">{results.submissions}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg NPS</p>
          <p className="font-medium">{results.avgNps ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg rating</p>
          <p className="font-medium">{results.avgRating ?? "—"}</p>
        </div>
      </div>
      {Object.keys(results.npsDistribution).length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {Object.entries(results.npsDistribution)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([score, count]) => (
              <span key={score} className="text-xs border rounded px-2 py-1">
                {score}: {count}
              </span>
            ))}
        </div>
      )}
    </Card>
  );
}
