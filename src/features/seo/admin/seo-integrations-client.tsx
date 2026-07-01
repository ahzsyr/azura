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

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/admin/seo/metadata" className="text-sm text-primary hover:underline">
          ← SEO Dashboard
        </Link>
        <AdminPageHeader
          className="mb-0 mt-2"
          title="SEO integrations"
          description="Configure Bing and IndexNow submissions and monitor the outbound SEO queue. Google settings live under Google in the SEO sidebar."
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Google Analytics, Tag Manager, and Search Console are configured in{" "}
          <Link href="/admin/seo/google" className="text-primary underline">
            Google settings
          </Link>
          .
        </p>
      </div>

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
  );
}
