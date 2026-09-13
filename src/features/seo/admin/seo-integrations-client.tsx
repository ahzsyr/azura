"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import type { PublicSeoIntegrationsConfig, SeoProviderHealth } from "@/features/seo/types";
import { IntegrationsConfigurePanel } from "./seo-integrations-configure-panel";
import { IntegrationsMonitorPanel } from "./seo-integrations-panels";
import { IntegrationsQueuePanel } from "./seo-integrations-queue-panel";
import {
  SEO_INTEGRATIONS_TABS,
  isValidIntegrationsTab,
  type SeoIntegrationsTabId,
} from "./seo-integrations-tabs";
import { SearchEngineQuickActions } from "@/features/seo/operator/components/search-engine-quick-actions";

type SubmissionMetrics = {
  pending: number;
  failed: number;
  completed: number;
  running: number;
  exhausted: number;
  failedLast24h: number;
  stuck: number;
  providerStats: Array<{
    provider: string;
    completed: number;
    failed: number;
    exhausted: number;
    total: number;
    successRate: number;
  }>;
  recent: Array<{
    id: string;
    provider: string;
    kind: string;
    status: string;
    url: string;
    lastError: string | null;
  }>;
};

type ProviderTelemetry = Array<{
  provider: string;
  successRate: number;
  p95LatencyMs: number;
  failures: number;
  volume: number;
}>;

type SearchReport = {
  totalClicks: number;
  totalImpressions: number;
  topPages: Array<{ key: string; clicks: number }>;
  topQueries: Array<{ key: string; clicks: number }>;
};

export type SeoIntegrationsClientProps = {
  config: PublicSeoIntegrationsConfig;
  health: SeoProviderHealth[];
  metrics: SubmissionMetrics;
  telemetry: ProviderTelemetry;
  searchReport: SearchReport;
  siteUrl: string;
  sitemapUrl: string;
};

export function SeoIntegrationsClient({
  config,
  health,
  metrics,
  telemetry,
  searchReport,
  siteUrl,
  sitemapUrl,
}: SeoIntegrationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const activeTab = useMemo((): SeoIntegrationsTabId => {
    return isValidIntegrationsTab(tabParam) ? tabParam : "monitor";
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    if (tabId !== "configure") {
      params.delete("provider");
      params.delete("integrationsSaved");
    }
    router.replace(`/admin/seo/integrations?${params.toString()}`, { scroll: false });
  };

  const bing = config.bing ?? {};
  const indexnow = config.indexnow ?? {};
  const googleIndexingRaw = config.google_indexing ?? {};
  const googleIndexing = {
    ...googleIndexingRaw,
    enabled:
      googleIndexingRaw.enabled ??
      Boolean(googleIndexingRaw.hasServiceAccountJson || config.google?.hasServiceAccountJson),
    hasServiceAccountJson: Boolean(
      googleIndexingRaw.hasServiceAccountJson || config.google?.hasServiceAccountJson,
    ),
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/admin/seo" className="text-sm text-primary hover:underline">
          ← SEO Dashboard
        </Link>
        <AdminPageHeader
          className="mb-0 mt-2"
          title="Search Engines"
          description="See connection status and submit waiting URLs. Advanced configuration is below."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {["google", "bing", "indexnow"].map((id) => {
          const row = health.find((item) => item.provider === id || (id === "google" && item.provider === "google_indexing"));
          const connected = Boolean(row?.enabled && row.ok);
          const label = id === "indexnow" ? "IndexNow" : id === "bing" ? "Bing" : "Google";
          return (
            <div key={id} className="rounded-lg border px-4 py-3 text-sm">
              <p className="font-medium">{label}</p>
              <p className={connected ? "text-emerald-700" : "text-muted-foreground"}>
                {connected ? "Connected" : "Not connected"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        {metrics.pending} waiting · {metrics.completed} submitted · {metrics.failed} failed
      </p>

      <SearchEngineQuickActions pendingCount={metrics.pending} />

      <details className="rounded-xl border" open={activeTab !== "monitor" || undefined}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Advanced Settings</summary>
        <div className="border-t px-4 py-4">
          <AdminSettingsLayout
            tabs={[...SEO_INTEGRATIONS_TABS]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            layoutId="seo-integrations-ribbon"
          >
            {(tab) => {
              if (tab === "monitor") {
                return (
                  <IntegrationsMonitorPanel
                    health={health}
                    metrics={metrics}
                    telemetry={telemetry}
                    searchReport={searchReport}
                  />
                );
              }

              if (tab === "configure") {
                return (
                  <IntegrationsConfigurePanel
                    bing={bing}
                    indexnow={indexnow}
                    googleIndexing={googleIndexing}
                    health={health}
                    siteUrl={siteUrl}
                    sitemapUrl={sitemapUrl}
                  />
                );
              }

              return (
                <IntegrationsQueuePanel metrics={metrics} health={health} sitemapUrl={sitemapUrl} />
              );
            }}
          </AdminSettingsLayout>
        </div>
      </details>
    </div>
  );
}
