"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card } from "@/components/ui/card";

type OperationalMetrics = {
  submissions: number;
  avgScore: number;
  assigned: number;
  archived: number;
  byPipeline: Array<{ pipelineType: string; count: number }>;
  byTemplate: Array<{ templateId: string; name: string; count: number }>;
};

type BehaviorMetrics = {
  views: number;
  focusEvents: number;
  blurEvents: number;
  changes: number;
  submissions: number;
  completionRate: number;
};

export function FormsAnalyticsPage({
  operational,
  behavior,
}: {
  operational: OperationalMetrics;
  behavior: BehaviorMetrics;
}) {
  const [tab, setTab] = useState<"operational" | "behavior">("operational");

  return (
    <>
      <AdminPageHeader
        title="Forms Analytics"
        description="Operational submission metrics and behavior analytics."
      />

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          className={`text-sm px-3 py-1 rounded ${tab === "operational" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          onClick={() => setTab("operational")}
        >
          Operational
        </button>
        <button
          type="button"
          className={`text-sm px-3 py-1 rounded ${tab === "behavior" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          onClick={() => setTab("behavior")}
        >
          Behavior
        </button>
      </div>

      {tab === "operational" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Submissions" value={String(operational.submissions)} />
          <MetricCard label="Avg score" value={String(operational.avgScore)} />
          <MetricCard label="Assigned" value={String(operational.assigned)} />
          <MetricCard label="Archived" value={String(operational.archived)} />
          <Card className="p-4 md:col-span-2">
            <h3 className="text-sm font-medium mb-2">By pipeline</h3>
            <ul className="text-sm space-y-1">
              {operational.byPipeline.map((p) => (
                <li key={p.pipelineType}>{p.pipelineType}: {p.count}</li>
              ))}
              {operational.byPipeline.length === 0 && (
                <li className="text-muted-foreground">No pipeline data yet</li>
              )}
            </ul>
          </Card>
          <Card className="p-4 md:col-span-2">
            <h3 className="text-sm font-medium mb-2">By template</h3>
            <ul className="text-sm space-y-1">
              {operational.byTemplate.map((t) => (
                <li key={t.templateId}>{t.name}: {t.count}</li>
              ))}
              {operational.byTemplate.length === 0 && (
                <li className="text-muted-foreground">No submissions yet</li>
              )}
            </ul>
          </Card>
        </div>
      )}

      {tab === "behavior" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Form views" value={String(behavior.views)} />
          <MetricCard label="Field changes" value={String(behavior.changes)} />
          <MetricCard label="Focus events" value={String(behavior.focusEvents)} />
          <MetricCard label="Blur events" value={String(behavior.blurEvents)} />
          <MetricCard label="Tracked submissions" value={String(behavior.submissions)} />
          <MetricCard label="Completion rate" value={`${Math.round(behavior.completionRate * 100)}%`} />
        </div>
      )}
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </Card>
  );
}
