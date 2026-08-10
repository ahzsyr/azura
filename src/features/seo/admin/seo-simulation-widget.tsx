"use client";

import { useMemo, useState } from "react";
import type { SeoRecommendation, SeoSimulation, ValidationResult } from "@/features/seo/platform/types";

type SeoSimulationWidgetProps = {
  validation: ValidationResult;
  recommendations: SeoRecommendation[];
  project: (acceptedIds: string[]) => SeoSimulation;
};

export function SeoSimulationWidget({
  validation,
  recommendations,
  project,
}: SeoSimulationWidgetProps) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const simulation = useMemo(
    () =>
      project([...accepted]),
    [accepted, project, recommendations]
  );

  function toggle(id: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">Recommendations</h2>
        <ul className="mt-3 space-y-2">
          {recommendations.length === 0 ? (
            <li className="text-sm text-muted-foreground">No recommendations.</li>
          ) : (
            recommendations.map((rec) => (
              <li key={rec.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={accepted.has(rec.id)}
                  onChange={() => toggle(rec.id)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">{rec.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {rec.severity} · {rec.derivedFrom.join(", ")}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">Current → Projected</h2>
        <div className="mt-4 flex items-end gap-4">
          <div>
            <p className="text-3xl font-semibold">{simulation.currentScore}</p>
            <p className="text-xs text-muted-foreground">Current</p>
          </div>
          <p className="pb-1 text-2xl text-muted-foreground">→</p>
          <div>
            <p className="text-3xl font-semibold text-primary">{simulation.projectedScore}</p>
            <p className="text-xs text-muted-foreground">Projected</p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-lg font-medium ${simulation.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
              {simulation.delta >= 0 ? "+" : ""}
              {simulation.delta}
            </p>
            <p className="text-xs text-muted-foreground">Delta</p>
          </div>
        </div>
        {simulation.estimates.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {simulation.estimates.map((e) => (
              <li key={e.label}>
                +{e.impact} {e.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
