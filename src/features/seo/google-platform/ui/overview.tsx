"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoogleWorkspaceSummary, GoogleOperationalCard } from "../monitoring";

export function GooglePlatformOverview({
  summary,
  cards,
  onNavigateTab,
}: {
  summary: GoogleWorkspaceSummary;
  cards: GoogleOperationalCard[];
  onNavigateTab: (tabId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Google Workspace</CardTitle>
          <CardDescription>Operational health across registered Google integrations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <Metric label="Connected Services" value={`${summary.connectedServices} / ${summary.totalServices}`} />
          <Metric label="Healthy" value={String(summary.healthy)} />
          <Metric label="Warnings" value={String(summary.warnings)} />
          <Metric label="Errors" value={String(summary.errors)} />
          <Metric label="Running Jobs" value={String(summary.runningJobs)} />
          <Metric label="Pending Jobs" value={String(summary.pendingJobs)} />
          <Metric
            label="Last Authentication"
            value={
              summary.lastAuthentication
                ? new Date(summary.lastAuthentication).toLocaleString()
                : "—"
            }
          />
          <Metric label="OAuth Status" value={summary.oauthStatus} />
          <Metric
            label="API Quota"
            value={summary.apiQuotaPercent == null ? "—" : `${summary.apiQuotaPercent}%`}
          />
          <Metric label="Background Workers" value={summary.backgroundWorkers} />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.id} className="cursor-pointer" onClick={() => onNavigateTab(card.tabId)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{card.displayName}</CardTitle>
                <Badge
                  className={
                    card.connected
                      ? "bg-emerald-600 text-white border-transparent"
                      : ""
                  }
                  variant={card.connected ? undefined : "outline"}
                >
                  {card.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">{card.healthMessage}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="grid grid-cols-2 gap-2">
                <span>Health {card.healthScore}%</span>
                <span>
                  Quota{" "}
                  {card.quotaMaximum
                    ? `${card.quotaCurrent ?? 0} / ${card.quotaMaximum}`
                    : "—"}
                </span>
                <span>Pending {card.pendingJobs}</span>
                <span>Errors {card.errors}</span>
              </div>
              <div>
                Last sync:{" "}
                {card.lastSyncAt ? new Date(card.lastSyncAt).toLocaleString() : "—"}
              </div>
              {card.dependencyMessage ? (
                <div className="text-amber-700 dark:text-amber-300">{card.dependencyMessage}</div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}
