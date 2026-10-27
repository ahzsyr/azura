import "server-only";

import { seoRepository } from "@/repositories/seo.repository";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { getFallbackDefaultLocalePrefix } from "@/i18n/url-helpers";
import { localeService } from "@/features/i18n/locale.service";
import {
  loadPageTargetSiteConfig,
  resolveCurrentSiteKey,
} from "@/features/search-intelligence/content-intelligence/page-target-store";
import type { PageSearchTarget } from "@/features/search-intelligence/content-intelligence/page-search-target";
import { normalizeTopic } from "@/features/search-intelligence/content-intelligence/page-search-target";
import { normalizeUrlForSiteMatch } from "./url-match-policy";
import { softIncludesPhrase } from "@/features/seo/platform/analyzers/topic-evidence";
import { pathForPageSearchTarget } from "./target-path";

export type TargetGscCompareFilters = {
  days?: number;
  country?: string;
  device?: string;
  unmatchedImpressionThreshold?: number;
};

export type TargetObservationRow = {
  targetId: string;
  entityType: string;
  entityId: string;
  locale: string;
  primaryTopic: string;
  canonicalUrl: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  topQueries: Array<{ query: string; impressions: number; clicks: number }>;
  topicQueryOverlap: boolean;
  status: "matched" | "no_observations";
};

export type UnmatchedGscUrlRow = {
  url: string;
  impressions: number;
  clicks: number;
  topQueries: string[];
};

export type TargetGscCompareReport = {
  siteKey: string;
  siteOrigin: string;
  gscPropertyLabel: string | null;
  dateRangeDays: number;
  filters: { country?: string; device?: string };
  freshness: string | null;
  caveats: string[];
  targets: TargetObservationRow[];
  unmatchedUrls: UnmatchedGscUrlRow[];
  opportunities: Array<{
    kind: "topic_mismatch" | "unmatched_url";
    label: string;
    impressions: number;
  }>;
};

async function deriveCanonicalForTarget(
  target: PageSearchTarget,
  siteOrigin: string,
): Promise<string> {
  const locales = await localeService.listEnabled();
  const locale =
    locales.find((l) => l.code === target.locale) ??
    locales.find((l) => l.isDefault) ??
    locales[0];
  const defaultPrefix =
    locales.find((l) => l.isDefault)?.urlPrefix ?? getFallbackDefaultLocalePrefix();
  const path = pathForPageSearchTarget(target);
  return buildCanonicalUrl(
    siteOrigin,
    locale?.urlPrefix ?? target.locale,
    path || "/",
    undefined,
    defaultPrefix,
  );
}

type Agg = {
  url: string;
  clicks: number;
  impressions: number;
  positionSum: number;
  rows: number;
  queries: Map<string, { clicks: number; impressions: number }>;
};

export async function buildTargetGscCompareReport(
  filters: TargetGscCompareFilters = {},
): Promise<TargetGscCompareReport> {
  const days = filters.days ?? 28;
  const unmatchedThreshold = filters.unmatchedImpressionThreshold ?? 20;
  const siteKey = await resolveCurrentSiteKey();
  const siteOrigin = (await resolveSiteOrigin("public")).replace(/\/$/, "");
  const config = await loadPageTargetSiteConfig(siteKey);

  const integrations = await seoRepository.getIntegrationsConfig().catch(() => null);
  const google = integrations?.google as
    | { siteUrl?: string; matchedGscSiteUrl?: string }
    | undefined;
  const gscPropertyLabel =
    google?.matchedGscSiteUrl?.trim() || google?.siteUrl?.trim() || null;

  const rows = await seoRepository.listSearchMetricsForCompare({
    days,
    country: filters.country,
    device: filters.device,
    source: "google",
  });

  const byUrl = new Map<string, Agg>();
  let latest: Date | null = null;
  for (const row of rows) {
    if (!latest || row.date > latest) latest = row.date;
    const normalized = normalizeUrlForSiteMatch(row.url, siteOrigin);
    if (!normalized) continue;
    const current = byUrl.get(normalized) ?? {
      url: row.url,
      clicks: 0,
      impressions: 0,
      positionSum: 0,
      rows: 0,
      queries: new Map(),
    };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.positionSum += row.position;
    current.rows += 1;
    if (row.query) {
      const q = current.queries.get(row.query) ?? { clicks: 0, impressions: 0 };
      q.clicks += row.clicks;
      q.impressions += row.impressions;
      current.queries.set(row.query, q);
    }
    byUrl.set(normalized, current);
  }

  const activeTargets = config.targets.filter(
    (t) => t.status === "active" || t.status === "draft",
  );

  const matchedNormalized = new Set<string>();
  const targets: TargetObservationRow[] = [];

  for (const target of activeTargets) {
    const canonicalUrl = await deriveCanonicalForTarget(target, siteOrigin);
    const normalized = normalizeUrlForSiteMatch(canonicalUrl, siteOrigin);
    const metric = normalized ? byUrl.get(normalized) : undefined;
    if (normalized && metric) matchedNormalized.add(normalized);

    const queryRows = metric
      ? [...metric.queries.entries()]
          .map(([query, stats]) => ({
            query,
            impressions: stats.impressions,
            clicks: stats.clicks,
          }))
          .sort((a, b) => b.impressions - a.impressions)
      : [];

    const overlapping = queryRows.filter(
      (q) =>
        softIncludesPhrase(q.query, target.primaryTopic, target.locale) ||
        normalizeTopic(q.query).includes(normalizeTopic(target.primaryTopic)),
    );

    targets.push({
      targetId: target.id,
      entityType: target.entity.type,
      entityId: target.entity.id,
      locale: target.locale,
      primaryTopic: target.primaryTopic,
      canonicalUrl,
      impressions: metric?.impressions ?? 0,
      clicks: metric?.clicks ?? 0,
      ctr: metric && metric.impressions > 0 ? metric.clicks / metric.impressions : 0,
      averagePosition: metric && metric.rows > 0 ? metric.positionSum / metric.rows : 0,
      topQueries: (overlapping.length ? overlapping : queryRows).slice(0, 5),
      topicQueryOverlap: overlapping.length > 0,
      status: metric ? "matched" : "no_observations",
    });
  }

  const unmatchedUrls: UnmatchedGscUrlRow[] = [];
  for (const [normalized, metric] of byUrl) {
    if (matchedNormalized.has(normalized)) continue;
    if (metric.impressions < unmatchedThreshold) continue;
    unmatchedUrls.push({
      url: metric.url,
      impressions: metric.impressions,
      clicks: metric.clicks,
      topQueries: [...metric.queries.entries()]
        .sort((a, b) => b[1].impressions - a[1].impressions)
        .slice(0, 3)
        .map(([q]) => q),
    });
  }
  unmatchedUrls.sort((a, b) => b.impressions - a.impressions);

  const opportunities: TargetGscCompareReport["opportunities"] = [];
  for (const t of targets) {
    if (t.impressions >= unmatchedThreshold && !t.topicQueryOverlap) {
      opportunities.push({
        kind: "topic_mismatch",
        label: `${t.primaryTopic} (${t.entityType}:${t.entityId}) has demand but weak query overlap`,
        impressions: t.impressions,
      });
    }
  }
  for (const u of unmatchedUrls.slice(0, 10)) {
    opportunities.push({
      kind: "unmatched_url",
      label: `Unmatched GSC URL ${u.url}`,
      impressions: u.impressions,
    });
  }
  opportunities.sort((a, b) => b.impressions - a.impressions);

  return {
    siteKey,
    siteOrigin,
    gscPropertyLabel,
    dateRangeDays: days,
    filters: {
      country: filters.country,
      device: filters.device,
    },
    freshness: latest ? latest.toISOString() : null,
    caveats: [
      "GSC data is incomplete and may omit low-volume queries.",
      "Not a universal search-volume database.",
      "v1 filters: date range, country, and device only (no search type).",
      "Unmatched URLs are reported, not dropped.",
    ],
    targets,
    unmatchedUrls: unmatchedUrls.slice(0, 50),
    opportunities: opportunities.slice(0, 20),
  };
}
