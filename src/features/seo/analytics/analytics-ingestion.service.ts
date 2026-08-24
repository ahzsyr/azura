import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoIntegrationProviderConfig } from "@/features/seo/types";
import { seoObservabilityFlags } from "@/features/seo/observability-flags";
import { normalizeGa4PropertyId } from "@/features/seo/admin/google-integration-readiness";
import { refreshGoogleToken } from "@/features/seo/integrations/google-auth";
import { resolveConfiguredGscSiteUrl } from "@/features/seo/integrations/google-verify";

type SeoSearchMetricInput = Parameters<typeof seoRepository.upsertSearchMetrics>[0][number];

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

function dateOnly(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fetchGoogleSearchMetrics(config: SeoIntegrationProviderConfig, days: number) {
  const token = await refreshGoogleToken(config);
  if (!token || !config.siteUrl) return [];
  const gscSiteUrl = await resolveConfiguredGscSiteUrl(config, token);
  const startDate = isoDate(dateOnly(days));
  const endDate = isoDate(dateOnly(1));
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    gscSiteUrl
  )}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["date", "page", "query", "country", "device"],
      rowLimit: 2500,
    }),
  });
  if (!response.ok) throw new Error(`Google Search Console analytics failed: ${await response.text()}`);
  const body = (await response.json()) as {
    rows?: Array<{
      keys?: string[];
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }>;
  };
  return (body.rows ?? []).map((row): SeoSearchMetricInput => {
    const [date, url, query, country, device] = row.keys ?? [];
    return {
      date: date ? new Date(`${date}T00:00:00.000Z`) : dateOnly(1),
      url: url || siteUrl,
      query: query ?? "",
      country: country ?? "",
      device: device ?? "",
      source: "google",
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    };
  });
}

async function fetchGa4Metrics(config: SeoIntegrationProviderConfig, token: string, days: number) {
  const propertyId = normalizeGa4PropertyId(config.ga4PropertyId);
  if (!propertyId) return [];

  const startDate = isoDate(dateOnly(days));
  const endDate = isoDate(dateOnly(1));
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }, { name: "pagePath" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
        ],
        limit: 2500,
      }),
    },
  );
  if (!response.ok) throw new Error(`GA4 analytics failed: ${await response.text()}`);

  const body = (await response.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  };

  return (body.rows ?? []).map((row): SeoSearchMetricInput => {
    const date = row.dimensionValues?.[0]?.value;
    const pagePath = row.dimensionValues?.[1]?.value ?? "/";
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);
    const pageViews = Number(row.metricValues?.[2]?.value ?? 0);
    const url = pagePath.startsWith("http") ? pagePath : `${siteUrl}${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`;

    return {
      date: date ? new Date(`${date}T00:00:00.000Z`) : dateOnly(1),
      url,
      query: "",
      country: "",
      device: "",
      source: "ga4",
      clicks: Math.round(sessions),
      impressions: Math.round(pageViews),
      ctr: pageViews === 0 ? 0 : sessions / pageViews,
      position: 0,
    };
  });
}

async function importGoogleRichResults(
  config: SeoIntegrationProviderConfig,
  token: string,
  rows: SeoSearchMetricInput[]
) {
  if (!config.siteUrl) return 0;
  const gscSiteUrl = await resolveConfiguredGscSiteUrl(config, token);
  const urls = [...new Set(rows.map((row) => row.url).filter(Boolean))].slice(0, 10);
  const issues: Parameters<typeof seoRepository.replaceRichResultIssues>[0] = [];
  for (const url of urls) {
    const response = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: gscSiteUrl }),
    }).catch(() => null);
    if (!response?.ok) continue;
    const body = (await response.json()) as {
      inspectionResult?: {
        richResultsResult?: {
          detectedItems?: Array<{
            richResultType?: string;
            items?: Array<{ name?: string; issues?: Array<{ issueMessage?: string; severity?: string }> }>;
          }>;
        };
      };
    };
    for (const detected of body.inspectionResult?.richResultsResult?.detectedItems ?? []) {
      for (const item of detected.items ?? []) {
        for (const issue of item.issues ?? []) {
          const severity = issue.severity?.toLowerCase() === "warning" ? "WARNING" : "ERROR";
          issues.push({
            issueKey: `google-${url}-${detected.richResultType}-${item.name}-${issue.issueMessage}`
              .replace(/[^a-zA-Z0-9_-]/g, "-")
              .slice(0, 256),
            type: detected.richResultType ?? "RichResult",
            category: severity,
            url,
            eligibility: severity === "ERROR" ? "NOT_ELIGIBLE" : "ELIGIBLE_WITH_WARNINGS",
            source: "google",
            details: { message: issue.issueMessage ?? "Search Console rich result issue" },
          });
        }
      }
    }
  }
  await seoRepository.replaceRichResultIssues(issues);
  return issues.length;
}

async function fetchBingSearchMetrics(config: SeoIntegrationProviderConfig, days: number) {
  if (!config.analyticsEnabled || !config.apiKey || !config.siteUrl) return [];
  const endpoint =
    config.endpoint?.trim() ||
    `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?apikey=${encodeURIComponent(
      config.apiKey
    )}&siteUrl=${encodeURIComponent(config.siteUrl)}`;
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) throw new Error(`Bing analytics failed: ${await response.text()}`);
  const body = (await response.json()) as { d?: unknown; rows?: unknown[] };
  const rows = Array.isArray(body.rows) ? body.rows : Array.isArray(body.d) ? body.d : [];
  return rows.slice(0, 1000).map((item): SeoSearchMetricInput => {
    const row = item as Record<string, unknown>;
    const clicks = Number(row.clicks ?? row.Clicks ?? 0);
    const impressions = Number(row.impressions ?? row.Impressions ?? 0);
    return {
      date: dateOnly(Math.min(days, 1)),
      url: String(row.url ?? row.Url ?? config.siteUrl),
      query: String(row.query ?? row.Query ?? ""),
      source: "bing",
      clicks,
      impressions,
      ctr: impressions === 0 ? 0 : clicks / impressions,
      position: Number(row.position ?? row.AveragePosition ?? 0),
    };
  });
}

export const seoAnalyticsIngestionService = {
  async run(days = 3, options?: { includeRichResults?: boolean }) {
    if (!seoObservabilityFlags.seoAnalyticsIngestion) {
      return { processed: 0, imported: 0, results: [] };
    }
    const includeRichResults =
      options?.includeRichResults ?? seoObservabilityFlags.seoRichResults;
    const config = await seoRepository.getIntegrationsConfig();
    const results: Array<{ provider: string; imported: number; ok: boolean; error?: string }> = [];

    if (config.google?.analyticsEnabled) {
      const token = await refreshGoogleToken(config.google).catch(() => undefined);

      if (config.google.siteUrl?.trim()) {
        try {
          const gscRows = await fetchGoogleSearchMetrics(config.google, days);
          await seoRepository.upsertSearchMetrics(gscRows);
          const richIssues =
            token && includeRichResults
              ? await importGoogleRichResults(config.google, token, gscRows)
              : 0;
          results.push({ provider: "google", imported: gscRows.length + richIssues, ok: true });
        } catch (error) {
          results.push({
            provider: "google",
            imported: 0,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (token && normalizeGa4PropertyId(config.google.ga4PropertyId)) {
        try {
          const ga4Rows = await fetchGa4Metrics(config.google, token, days);
          await seoRepository.upsertSearchMetrics(ga4Rows);
          results.push({ provider: "ga4", imported: ga4Rows.length, ok: true });
        } catch (error) {
          results.push({
            provider: "ga4",
            imported: 0,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (config.bing?.analyticsEnabled) {
      try {
        const rows = await fetchBingSearchMetrics(config.bing, days);
        await seoRepository.upsertSearchMetrics(rows);
        results.push({ provider: "bing", imported: rows.length, ok: true });
      } catch (error) {
        results.push({
          provider: "bing",
          imported: 0,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      processed: results.length,
      imported: results.reduce((sum, result) => sum + result.imported, 0),
      results,
    };
  },
};
