import { Suspense } from "react";
import { redirect } from "next/navigation";
import { seoRepository } from "@/repositories/seo.repository";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import { SeoIntegrationsClient } from "@/features/seo/admin/seo-integrations-client";
import { getServerDefaultSitemapUrl } from "@/features/seo/integrations/enqueue";
import { getServerAppOrigin } from "@/lib/oauth-redirect-origin";
import type { PublicSeoIntegrationsConfig, SeoProviderHealth } from "@/features/seo/types";

export const dynamic = "force-dynamic";

export default async function SeoIntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ googleOAuth?: string; tab?: string; message?: string; provider?: string }>;
}) {
  let config: PublicSeoIntegrationsConfig = {};
  let health: SeoProviderHealth[] = [];
  let telemetry: Awaited<ReturnType<typeof seoRepository.getProviderTelemetryMetrics>> = [];
  let searchReport: Awaited<ReturnType<typeof seoRepository.getSearchMetricReport>> = {
    topPages: [],
    topQueries: [],
    totalClicks: 0,
    totalImpressions: 0,
  };
  let metrics: Awaited<ReturnType<typeof seoRepository.getSubmissionMetrics>> = {
    pending: 0,
    failed: 0,
    completed: 0,
    running: 0,
    exhausted: 0,
    failedLast24h: 0,
    stuck: 0,
    providerStats: [],
    recent: [],
  };

  try {
    config = await seoRepository.getPublicIntegrationsConfig();
  } catch {
    // DB unavailable
  }

  try {
    health = await seoIntegrationRegistry.health();
  } catch {
    // DB unavailable
  }

  try {
    metrics = await seoRepository.getSubmissionMetrics();
  } catch {
    // SEO job tables may be missing or pool busy
  }

  try {
    telemetry = await seoRepository.getProviderTelemetryMetrics();
  } catch {
    // SEO telemetry tables may be missing or pool busy
  }

  try {
    searchReport = await seoRepository.getSearchMetricReport();
  } catch {
    // SEO metrics tables may be missing or pool busy
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  if (resolvedSearchParams.googleOAuth || resolvedSearchParams.provider === "google") {
    const params = new URLSearchParams();
    params.set("tab", "search-console");
    if (resolvedSearchParams.googleOAuth) {
      params.set("googleOAuth", resolvedSearchParams.googleOAuth);
    }
    if (resolvedSearchParams.message) {
      params.set("message", resolvedSearchParams.message);
    }
    redirect(`/admin/seo/google?${params.toString()}`);
  }

  const siteUrl = (await getServerAppOrigin()).replace(/\/$/, "");
  const sitemapUrl = await getServerDefaultSitemapUrl();

  return (
    <Suspense fallback={null}>
      <SeoIntegrationsClient
        config={config}
        health={health}
        metrics={metrics}
        telemetry={telemetry}
        searchReport={searchReport}
        siteUrl={siteUrl}
        sitemapUrl={sitemapUrl}
      />
    </Suspense>
  );
}
