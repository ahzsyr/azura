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

  return null;
}
