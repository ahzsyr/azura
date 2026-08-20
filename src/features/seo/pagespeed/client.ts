import "server-only";

import { seoRepository } from "@/repositories/seo.repository";
import { getGooglePlatformState } from "@/features/seo/google-platform/persistence";

export type PageSpeedStrategy = "mobile" | "desktop";

export type PageSpeedOpportunity = {
  id: string;
  title: string;
  savingsMs?: number;
};

export type PageSpeedAuditResult = {
  url: string;
  strategy: PageSpeedStrategy;
  fetchedAt: string;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  opportunities: PageSpeedOpportunity[];
  live: true;
  configureHref: string;
};

export async function resolvePageSpeedApiKey(): Promise<string | null> {
  const platform = await getGooglePlatformState().catch(() => null);
  const fromPlatform = platform?.services?.pagespeed?.configuration?.apiKey;
  if (typeof fromPlatform === "string" && fromPlatform.trim()) {
    return fromPlatform.trim();
  }
  const integrations = await seoRepository.getIntegrationsConfig().catch(() => null);
  const fromLegacy = integrations?.google?.apiKey;
  if (typeof fromLegacy === "string" && fromLegacy.trim()) {
    return fromLegacy.trim();
  }
  return null;
}

function categoryScore(categories: Record<string, { score?: number | null }> | undefined, key: string) {
  const score = categories?.[key]?.score;
  return typeof score === "number" ? Math.round(score * 100) : null;
}

function metricMs(audits: Record<string, { numericValue?: number }> | undefined, id: string) {
  const value = audits?.[id]?.numericValue;
  return typeof value === "number" ? Math.round(value) : null;
}

export async function runPageSpeedInsights(input: {
  url: string;
  strategy?: PageSpeedStrategy;
  apiKey?: string | null;
}): Promise<PageSpeedAuditResult> {
  const apiKey = input.apiKey ?? (await resolvePageSpeedApiKey());
  if (!apiKey) {
    throw new Error(
      "PageSpeed API key not configured. Add it under Admin → SEO → Google → PageSpeed Insights.",
    );
  }

  const strategy = input.strategy ?? "mobile";
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", input.url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("key", apiKey);
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) {
    endpoint.searchParams.append("category", category);
  }

  const response = await fetch(endpoint.toString(), { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `PageSpeed Insights failed (${response.status}): ${body.slice(0, 300) || response.statusText}`,
    );
  }

  const body = (await response.json()) as {
    lighthouseResult?: {
      categories?: Record<string, { score?: number | null }>;
      audits?: Record<
        string,
        {
          id?: string;
          title?: string;
          numericValue?: number;
          details?: { overallSavingsMs?: number; type?: string };
        }
      >;
    };
  };

  const categories = body.lighthouseResult?.categories;
  const audits = body.lighthouseResult?.audits ?? {};
  const opportunities = Object.values(audits)
    .filter((audit) => audit.details?.type === "opportunity" && (audit.details.overallSavingsMs ?? 0) > 0)
    .map((audit) => ({
      id: String(audit.id ?? ""),
      title: String(audit.title ?? audit.id ?? "Opportunity"),
      savingsMs:
        typeof audit.details?.overallSavingsMs === "number"
          ? Math.round(audit.details.overallSavingsMs)
          : undefined,
    }))
    .sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0))
    .slice(0, 8);

  return {
    url: input.url,
    strategy,
    fetchedAt: new Date().toISOString(),
    performanceScore: categoryScore(categories, "performance"),
    accessibilityScore: categoryScore(categories, "accessibility"),
    bestPracticesScore: categoryScore(categories, "best-practices"),
    seoScore: categoryScore(categories, "seo"),
    lcpMs: metricMs(audits, "largest-contentful-paint"),
    cls:
      typeof audits["cumulative-layout-shift"]?.numericValue === "number"
        ? Number(audits["cumulative-layout-shift"].numericValue.toFixed(3))
        : null,
    inpMs: metricMs(audits, "interaction-to-next-paint") ?? metricMs(audits, "max-potential-fid"),
    opportunities,
    live: true,
    configureHref: "/admin/seo/google?tab=pagespeed",
  };
}
