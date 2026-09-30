import "server-only";

import { indexNowProvider } from "@/features/seo/integrations/providers";
import { submitIndexNowUrls } from "@/features/seo/integrations/indexnow-submit";
import { enqueueSitemapSubmission } from "@/features/seo/integrations/enqueue";
import { listPriorityIndexableUrls } from "@/features/seo/resolve-indexable-url";
import {
  repairSeoDataIssues,
  type SeoDataRepairReport,
} from "@/features/seo/quality/repair-seo-data.service";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { ensureStaticSeoMetaRecords } from "@/features/seo/seo-static.service";
import { seoRepository } from "@/repositories/seo.repository";

export type SubmitPriorityPagesResult = {
  urls: string[];
  repair: SeoDataRepairReport;
  indexNow: {
    configured: boolean;
    submitted: number;
    ok: boolean;
    message: string;
    host?: string;
    keyLocation?: string;
  };
  indexingApi: {
    configured: boolean;
    submitted: number;
    failed: number;
    skipped: boolean;
    errors: string[];
    message?: string;
  };
};

async function submitIndexNowBatch(urls: string[], siteOrigin: string) {
  const integrations = await seoRepository.getIntegrationsConfig();
  const config = integrations.indexnow;
  if (!config || !indexNowProvider.isConfigured(config)) {
    return {
      configured: false,
      submitted: 0,
      ok: false,
      message: "IndexNow is not configured",
    };
  }

  const result = await submitIndexNowUrls(config, urls, siteOrigin);
  return {
    configured: true,
    submitted: result.ok ? urls.length : 0,
    ok: result.ok,
    message: result.ok
      ? `Submitted ${urls.length} URLs to IndexNow (${result.host})`
      : result.message,
    host: result.host,
    keyLocation: result.keyLocation,
  };
}

/**
 * Repair main-page robots/canonical data, then submit priority marketing URLs
 * to IndexNow and ping the sitemap (GSC/Bing). Does not call the Google Indexing API
 * (restricted to JobPosting / BroadcastEvent).
 */
export async function submitPriorityPages(siteOrigin?: string): Promise<SubmitPriorityPagesResult> {
  const origin = (siteOrigin ?? (await resolveSiteOrigin("public"))).replace(/\/$/, "");
  await ensureStaticSeoMetaRecords();
  const repair = await repairSeoDataIssues();
  const urls = await listPriorityIndexableUrls(origin);
  const indexNow = await submitIndexNowBatch(urls, origin);
  await enqueueSitemapSubmission("sitemap", origin).catch(() => 0);

  const integrations = await seoRepository.getIntegrationsConfig();
  const indexingConfigured = Boolean(integrations.google_indexing?.enabled);

  return {
    urls,
    repair,
    indexNow,
    indexingApi: {
      configured: indexingConfigured,
      submitted: 0,
      failed: 0,
      skipped: true,
      errors: [],
      message:
        "Indexing API is limited to JobPosting and BroadcastEvent; priority pages use sitemap + IndexNow",
    },
  };
}