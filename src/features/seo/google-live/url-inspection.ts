import "server-only";

import { seoRepository } from "@/repositories/seo.repository";
import { refreshGoogleToken } from "@/features/seo/integrations/google-auth";
import { resolveConfiguredGscSiteUrl } from "@/features/seo/integrations/google-verify";
import { normalizeGscSiteUrl } from "@/features/seo/admin/google-gsc-site-url";
import type { UrlInspectorVm } from "@/features/search-intelligence/workspaces";

export type UrlInspectionLiveResult = UrlInspectorVm & {
  live: true;
  verdict?: string | null;
  coverageState?: string | null;
  rawSummary?: string;
  configureHref: string;
};

export async function inspectUrlWithSearchConsole(url: string): Promise<UrlInspectionLiveResult> {
  const integrations = await seoRepository.getIntegrationsConfig();
  const google = integrations.google;
  if (!google?.enabled || !google.siteUrl?.trim() || !google.bearerToken?.trim()) {
    throw new Error(
      "Search Console is not connected. Connect it under Admin → SEO → Google → Search Console.",
    );
  }

  const token = (await refreshGoogleToken(google))?.trim();
  if (!token) {
    throw new Error("Could not refresh Google OAuth token for Search Console.");
  }

  const siteUrl = await resolveConfiguredGscSiteUrl(google, token).catch(() =>
    normalizeGscSiteUrl(google.siteUrl!),
  );

  const response = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `URL Inspection failed (${response.status}): ${body.slice(0, 300) || response.statusText}`,
    );
  }

  const body = (await response.json()) as {
    inspectionResult?: {
      indexStatusResult?: {
        verdict?: string;
        coverageState?: string;
        lastCrawlTime?: string;
        pageFetchState?: string;
        indexingState?: string;
        googleCanonical?: string;
        userCanonical?: string;
      };
      richResultsResult?: {
        verdict?: string;
        detectedItems?: Array<{ richResultType?: string }>;
      };
      mobileUsabilityResult?: { verdict?: string };
    };
  };

  const index = body.inspectionResult?.indexStatusResult;
  const rich = body.inspectionResult?.richResultsResult;
  const mobile = body.inspectionResult?.mobileUsabilityResult;
  const verdict = index?.verdict ?? null;
  const coverageState = index?.coverageState ?? null;
  const indexed =
    String(verdict ?? "").toUpperCase() === "PASS" ||
    String(coverageState ?? "").toLowerCase().includes("indexed");

  const richVerdict = String(rich?.verdict ?? "").toUpperCase();
  const richResults: UrlInspectorVm["richResults"] =
    richVerdict === "PASS" ? "valid" : richVerdict === "FAIL" ? "invalid" : "unknown";

  const types = new Set((rich?.detectedItems ?? []).map((d) => d.richResultType ?? ""));
  const lastCrawl = index?.lastCrawlTime ? new Date(index.lastCrawlTime) : null;
  const lastCrawledLabel = lastCrawl
    ? lastCrawl.toLocaleString()
    : coverageState || "No crawl time";

  return {
    url,
    indexed,
    lastCrawledLabel,
    canonical: index?.googleCanonical || index?.userCanonical || url,
    richResults,
    breadcrumbValid: types.has("Breadcrumbs") || types.has("BreadcrumbList") || richResults === "valid",
    faqValid: types.has("FAQ") || types.has("FAQPage"),
    mobileFriendly: String(mobile?.verdict ?? "").toUpperCase() !== "FAIL",
    cwv: "needs_improvement",
    live: true,
    verdict,
    coverageState,
    rawSummary: [verdict, coverageState, index?.indexingState].filter(Boolean).join(" · "),
    configureHref: "/admin/seo/google?tab=search_console",
  };
}
