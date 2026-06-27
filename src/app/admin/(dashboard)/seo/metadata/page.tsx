import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { AdminSeoHub } from "@/features/seo/admin/admin-seo-hub";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { listPageSeoContexts } from "@/features/seo/resolve-page-seo-context";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import type { SeoProviderHealth } from "@/features/seo/types";
import type { PageSeoContext } from "@/features/seo/page-seo-context.types";

export default async function AdminSeoMetadataPage() {
  let contextsByKey: Record<string, PageSeoContext> = {};
  let cmsCount = 0;
  let postCount = 0;
  let integrationHealth: SeoProviderHealth[] = [];
  let providerTelemetry: Awaited<ReturnType<typeof seoRepository.getProviderTelemetryMetrics>> = [];
  let searchReport: Awaited<ReturnType<typeof seoRepository.getSearchMetricReport>> = {
    topPages: [],
    topQueries: [],
    totalClicks: 0,
    totalImpressions: 0,
  };
  let submissionMetrics: Awaited<ReturnType<typeof seoRepository.getSubmissionMetrics>> = {
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
    [integrationHealth, submissionMetrics, providerTelemetry, searchReport] = await Promise.all([
      seoIntegrationRegistry.health(),
      seoRepository.getSubmissionMetrics(),
      seoRepository.getProviderTelemetryMetrics(),
      seoRepository.getSearchMetricReport(),
    ]);
  } catch (error) {
    console.error("[seo/metadata] integration metrics load failed:", error);
  }

  try {
    const pageKeys = STATIC_SEO_PAGES.map((p) => p.pageKey);
    contextsByKey = await listPageSeoContexts(pageKeys, { allowWrites: true });
  } catch (error) {
    console.error("[seo/metadata] listPageSeoContexts failed:", error);
  }

  try {
    [cmsCount, postCount] = await Promise.all([
      prisma.cmsPage.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);
  } catch (error) {
    console.error("[seo/metadata] content counts failed:", error);
  }

  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl border bg-muted/40" />}>
      <AdminSeoHub
        contextsByKey={contextsByKey}
        cmsCount={cmsCount}
        postCount={postCount}
        integrationHealth={integrationHealth}
        submissionMetrics={submissionMetrics}
        providerTelemetry={providerTelemetry}
        searchReport={searchReport}
      />
    </Suspense>
  );
}
