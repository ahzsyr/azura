import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { listPageSeoContexts } from "@/features/seo/resolve-page-seo-context";
import { AdminSeoHub } from "@/features/seo/admin/admin-seo-hub";

export const dynamic = "force-dynamic";

export default async function AdminSeoMetadataPage() {
  const staticPageKeys = STATIC_SEO_PAGES.map((page) => page.pageKey);

  let contextsByKey: Awaited<ReturnType<typeof listPageSeoContexts>> = {};
  let cmsCount = 0;
  let postCount = 0;
  let integrationHealth: Awaited<ReturnType<typeof seoIntegrationRegistry.health>> = [];
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
  let providerTelemetry: Awaited<ReturnType<typeof seoRepository.getProviderTelemetryMetrics>> = [];
  let searchReport: Awaited<ReturnType<typeof seoRepository.getSearchMetricReport>> = {
    totalClicks: 0,
    totalImpressions: 0,
    topPages: [],
    topQueries: [],
  };

  try {
    contextsByKey = await listPageSeoContexts(staticPageKeys);
  } catch {
    // DB unavailable
  }

  try {
    [cmsCount, postCount] = await Promise.all([
      prisma.cmsPage.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);
  } catch {
    // DB unavailable
  }

  try {
    [integrationHealth, submissionMetrics, providerTelemetry, searchReport] = await Promise.all([
      seoIntegrationRegistry.health({ liveGoogle: false }),
      seoRepository.getSubmissionMetrics(),
      seoRepository.getProviderTelemetryMetrics(),
      seoRepository.getSearchMetricReport(),
    ]);
  } catch {
    // DB / integrations unavailable
  }

  return (
    <Suspense fallback={null}>
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
