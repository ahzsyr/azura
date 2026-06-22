import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { AdminSeoHub } from "@/features/seo/admin/admin-seo-hub";
import { ensureStaticSeoMetaRecords } from "@/features/seo/seo-static.service";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation";
import { translationService } from "@/features/translation/translation.service";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import type { SeoProviderHealth } from "@/features/seo/types";

export default async function AdminSeoPage() {
  let pageMetas: Awaited<ReturnType<typeof seoRepository.listPageKeyMeta>> = [];
  let cmsCount = 0;
  let postCount = 0;
  let translationsByKey: Record<string, Record<string, string>> = {};
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
    await ensureStaticSeoMetaRecords();
    [pageMetas, cmsCount, postCount, integrationHealth, submissionMetrics, providerTelemetry, searchReport] = await Promise.all([
      seoRepository.listPageKeyMeta(),
      prisma.cmsPage.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      seoIntegrationRegistry.health(),
      seoRepository.getSubmissionMetrics(),
      seoRepository.getProviderTelemetryMetrics(),
      seoRepository.getSearchMetricReport(),
    ]);

    const translationEntries = await Promise.all(
      pageMetas
        .filter((meta) => meta.pageKey)
        .map(async (meta) => {
          const translations = await translationService.getForEntity("SeoMeta", meta.id);
          return [
            meta.pageKey!,
            legacyShapeFromTranslations(translations, [
              "metaTitle",
              "metaDescription",
              "ogTitle",
              "ogDescription",
            ]),
          ] as const;
        })
    );
    translationsByKey = Object.fromEntries(translationEntries);
  } catch {
    // DB not connected
  }

  const metaByKey = Object.fromEntries(
    pageMetas.filter((m) => m.pageKey).map((m) => [m.pageKey!, m]),
  );

  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl border bg-muted/40" />}>
      <AdminSeoHub
        metaByKey={metaByKey}
        translationsByKey={translationsByKey}
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
