"use client";

import { Card } from "@/components/ui/card";
import type { FieldPerformance } from "@/features/forms/behavior-analytics.service";
import type { BehaviorMetrics } from "@/features/forms/behavior-analytics.service";

type Props = {
  behavior: BehaviorMetrics;
  fieldPerformance?: FieldPerformance[];
  labelMap?: Record<string, string>;
  templateName?: string;
};

export function TemplateAnalyticsStrip({
  behavior,
  fieldPerformance = [],
  labelMap = {},
  templateName,
}: Props) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium text-sm mb-3">
          {templateName ? `${templateName} · Metrics` : "Metrics"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <Metric label="Views" value={String(behavior.views)} />
          <Metric label="Submissions" value={String(behavior.submissions)} />
          <Metric label="Completion" value={`${Math.round(behavior.completionRate * 100)}%`} />
          <Metric label="Focus events" value={String(behavior.focusEvents)} />
          <Metric label="Changes" value={String(behavior.changes)} />
        </div>
      </Card>

      {fieldPerformance.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-medium text-sm">Field performance</h3>
          <div className="space-y-2">
            {fieldPerformance.map((f) => (
              <div key={f.bindingId} className="flex items-center gap-3">
                <div className="w-32 text-sm truncate" title={f.bindingId}>
                  {labelMap[f.bindingId] ?? f.bindingId}
                </div>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${f.completionPercent}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm tabular-nums">{f.completionPercent}%</div>
                <div className="text-xs text-muted-foreground w-20">completed</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
