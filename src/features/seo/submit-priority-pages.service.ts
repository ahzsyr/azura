import "server-only";

import { publishUrlToIndexingApi } from "@/features/seo/google-live/indexing-api";
import { indexNowProvider } from "@/features/seo/integrations/providers";
import { submitIndexNowUrls } from "@/features/seo/integrations/indexnow-submit";
import {
  listPriorityIndexableUrls,
  resolveCanonicalHomeUrl,
} from "@/features/seo/resolve-indexable-url";
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
    errors: string[];
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
 * to IndexNow and request indexing for the canonical homepage.
 */
export async function submitPriorityPages(siteOrigin?: string): Promise<SubmitPriorityPagesResult> {
  const origin = (siteOrigin ?? (await resolveSiteOrigin("public"))).replace(/\/$/, "");
  await ensureStaticSeoMetaRecords();
  const repair = await repairSeoDataIssues();
  const urls = await listPriorityIndexableUrls(origin);
  const indexNow = await submitIndexNowBatch(urls, origin);

  const integrations = await seoRepository.getIntegrationsConfig();
  const indexingConfigured = Boolean(integrations.google_indexing?.enabled);
  const homeUrl = await resolveCanonicalHomeUrl(origin);
  const indexingErrors: string[] = [];
  let indexingSubmitted = 0;
  let indexingFailed = 0;

  if (indexingConfigured) {
    try {
      await publishUrlToIndexingApi(homeUrl, "URL_UPDATED");
      indexingSubmitted += 1;
    } catch (error) {
      indexingFailed += 1;
      indexingErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    urls,
    repair,
    indexNow,
    indexingApi: {
      configured: indexingConfigured,
      submitted: indexingSubmitted,
      failed: indexingFailed,
      errors: indexingErrors,
    },
  };
}