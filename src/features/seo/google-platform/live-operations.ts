import "server-only";

import type { GoogleIntegrationId, GoogleOperationResult } from "./types";

function opOk(message: string, dryRun?: boolean, data?: Record<string, unknown>): GoogleOperationResult {
  return { ok: true, message: dryRun ? `[dry-run] ${message}` : message, dryRun, data };
}

function opFail(message: string): GoogleOperationResult {
  return { ok: false, message };
}

/**
 * Server-only live Google operation implementations.
 * Kept out of definitions/registry so client bundles never import server-only modules.
 */
export async function executeLiveGoogleOperation(
  integrationId: GoogleIntegrationId,
  operationId: string,
  params: Record<string, unknown>,
  options?: { dryRun?: boolean },
): Promise<GoogleOperationResult | null> {
  const dryRun = Boolean(options?.dryRun);

  if (integrationId === "pagespeed" && operationId === "run_audit") {
    if (dryRun) return opOk(`Audit dry-run for ${String(params.url ?? "default URLs")}`, true);
    const url = String(params.url ?? "").trim();
    if (!url) return opFail("URL is required for PageSpeed audit");
    const strategy = params.strategy === "desktop" ? "desktop" : "mobile";
    try {
      const { runPageSpeedInsights } = await import("@/features/seo/pagespeed/client");
      const data = await runPageSpeedInsights({ url, strategy });
      return opOk(
        `PageSpeed ${strategy}: Perf ${data.performanceScore ?? "—"}, LCP ${
          data.lcpMs != null ? `${(data.lcpMs / 1000).toFixed(1)}s` : "—"
        }`,
        false,
        data,
      );
    } catch (error) {
      return opFail(error instanceof Error ? error.message : String(error));
    }
  }

  if (integrationId === "search_console" && operationId === "inspect_url") {
    if (dryRun) return opOk(`URL inspection dry-run for ${String(params.url ?? "")}`, true);
    const url = String(params.url ?? "").trim();
    if (!url) return opFail("URL is required");
    try {
      const { inspectUrlWithSearchConsole } = await import("@/features/seo/google-live/url-inspection");
      const data = await inspectUrlWithSearchConsole(url);
      return opOk(data.rawSummary || (data.indexed ? "Indexed" : "Not indexed"), false, data);
    } catch (error) {
      return opFail(error instanceof Error ? error.message : String(error));
    }
  }

  if (integrationId === "indexing_api" && operationId === "publish_url") {
    if (dryRun) return opOk(`Publish dry-run for ${String(params.url ?? "")}`, true);
    const url = String(params.url ?? "").trim();
    if (!url) return opFail("URL is required");
    try {
      const { publishUrlToIndexingApi } = await import("@/features/seo/google-live/indexing-api");
      const data = await publishUrlToIndexingApi(url, "URL_UPDATED");
      return opOk(`Indexing notification submitted for ${url}`, false, data);
    } catch (error) {
      return opFail(error instanceof Error ? error.message : String(error));
    }
  }

  if (integrationId === "indexing_api" && operationId === "delete_url") {
    if (dryRun) return opOk(`Delete dry-run for ${String(params.url ?? "")}`, true);
    const url = String(params.url ?? "").trim();
    if (!url) return opFail("URL is required");
    try {
      const { publishUrlToIndexingApi } = await import("@/features/seo/google-live/indexing-api");
      const data = await publishUrlToIndexingApi(url, "URL_DELETED");
      return opOk(`Indexing delete notification submitted for ${url}`, false, data);
    } catch (error) {
      return opFail(error instanceof Error ? error.message : String(error));
    }
  }

  if (integrationId === "business_profile" && operationId === "refresh_location") {
    if (dryRun) return opOk("Location refresh dry-run", true);
    try {
      const { syncBusinessProfileLocations } = await import(
        "@/features/seo/google-live/business-profile"
      );
      const data = await syncBusinessProfileLocations();
      return opOk(data.message, false, data);
    } catch (error) {
      return opFail(error instanceof Error ? error.message : String(error));
    }
  }

  if (integrationId === "indexnow" && (operationId === "submit_url" || operationId === "submit_batch")) {
    if (dryRun) {
      return opOk(
        operationId === "submit_batch" ? "IndexNow batch dry-run" : `IndexNow dry-run for ${String(params.url ?? "")}`,
        true,
      );
    }
    try {
      const { seoRepository } = await import("@/repositories/seo.repository");
      const { indexNowProvider } = await import("@/features/seo/integrations/providers");
      const { submitIndexNowUrls } = await import("@/features/seo/integrations/indexnow-submit");
      const config = (await seoRepository.getIntegrationsConfig()).indexnow;
      if (!config || !indexNowProvider.isConfigured(config)) {
        return opFail("IndexNow is not configured. Add the API key under Search Engines → IndexNow.");
      }
      let urls: string[] = [];
      if (operationId === "submit_batch") {
        const { listPriorityIndexableUrls } = await import("@/features/seo/resolve-indexable-url");
        urls = await listPriorityIndexableUrls();
      } else {
        const url = String(params.url ?? "").trim();
        if (!url) return opFail("URL is required");
        urls = [url];
      }
      const data = await submitIndexNowUrls(config, urls);
      if (!data.ok) {
        return opFail(data.message || "IndexNow submission failed");
      }
      return opOk(
        `IndexNow submitted ${data.urlCount} URL(s) as ${data.host}`,
        false,
        data as unknown as Record<string, unknown>,
      );
    } catch (error) {
      return opFail(error instanceof Error ? error.message : String(error));
    }
  }

  return null;
}
