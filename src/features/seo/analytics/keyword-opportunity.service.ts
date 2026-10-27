import "server-only";

import { seoRepository } from "@/repositories/seo.repository";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import {
  loadPageTargetSiteConfig,
  resolveCurrentSiteKey,
} from "@/features/search-intelligence/content-intelligence/page-target-store";
import { normalizeKeyword } from "@/features/search-intelligence/content-intelligence/keyword-registry";
import { normalizeTopic } from "@/features/search-intelligence/content-intelligence/page-search-target";
import { softIncludesPhrase } from "@/features/seo/platform/analyzers/topic-evidence";
import { pathForPageSearchTarget } from "./target-path";
import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { getFallbackDefaultLocalePrefix } from "@/i18n/url-helpers";
import { localeService } from "@/features/i18n/locale.service";
import { normalizeUrlForSiteMatch } from "./url-match-policy";

export type KeywordOpportunityGapStatus = "unassigned" | "mismatch" | "aligned";

export type KeywordOpportunityRow = {
  keyword: string;
  normalizedKeyword: string;
  assignedEntity: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  gapStatus: KeywordOpportunityGapStatus;
  locale?: string;
  keywordRecordId?: string;
  targetId?: string;
};

export type KeywordOpportunityBoard = {
  siteKey: string;
  siteOrigin: string;
  gscPropertyLabel: string | null;
  dateRangeDays: number;
  filters: { country?: string; device?: string };
  freshness: string | null;
  caveats: string[];
  rows: KeywordOpportunityRow[];
};

export async function buildKeywordOpportunityBoard(input: {
  days?: number;
  country?: string;
  device?: string;
  unmatchedImpressionThreshold?: number;
} = {}): Promise<KeywordOpportunityBoard> {
  const days = input.days ?? 28;
  const threshold = input.unmatchedImpressionThreshold ?? 10;
  const siteKey = await resolveCurrentSiteKey();
  const siteOrigin = (await resolveSiteOrigin("public")).replace(/\/$/, "");
  const config = await loadPageTargetSiteConfig(siteKey);
  const locales = await localeService.listEnabled();
  const defaultPrefix =
    locales.find((l) => l.isDefault)?.urlPrefix ?? getFallbackDefaultLocalePrefix();

  const integrations = await seoRepository.getIntegrationsConfig().catch(() => null);
  const google = integrations?.google as
    | { siteUrl?: string; matchedGscSiteUrl?: string }
    | undefined;
  const gscPropertyLabel =
    google?.matchedGscSiteUrl?.trim() || google?.siteUrl?.trim() || null;

  const metrics = await seoRepository.listSearchMetricsForCompare({
    days,
    country: input.country,
    device: input.device,
    source: "google",
  });

  type QueryAgg = {
    impressions: number;
    clicks: number;
    positionSum: number;
    rows: number;
    urls: Map<string, number>;
  };
  const byQuery = new Map<string, QueryAgg>();
  let latest: Date | null = null;

  for (const row of metrics) {
    if (!row.query?.trim()) continue;
    if (!latest || row.date > latest) latest = row.date;
    const key = normalizeKeyword(row.query);
    if (!key) continue;
    const current = byQuery.get(key) ?? {
      impressions: 0,
      clicks: 0,
      positionSum: 0,
      rows: 0,
      urls: new Map(),
    };
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.positionSum += row.position;
    current.rows += 1;
    if (row.url) {
      const n = normalizeUrlForSiteMatch(row.url, siteOrigin) ?? row.url;
      current.urls.set(n, (current.urls.get(n) ?? 0) + row.impressions);
    }
    byQuery.set(key, current);
  }

  const keywordByNorm = new Map(
    config.keywords
      .filter((k) => k.status !== "retired")
      .map((k) => [`${k.locale}::${k.normalizedKeyword}`, k] as const),
  );
  const keywordsByNormOnly = new Map<string, (typeof config.keywords)[number]>();
  for (const k of config.keywords) {
    if (k.status === "retired") continue;
    if (!keywordsByNormOnly.has(k.normalizedKeyword)) {
      keywordsByNormOnly.set(k.normalizedKeyword, k);
    }
  }

  const targetByEntityLocale = new Map(
    config.targets
      .filter((t) => t.status === "active" || t.status === "draft")
      .map((t) => [`${t.locale}::${t.entity.type}:${t.entity.id}`, t] as const),
  );

  const targetCanonicalById = new Map<string, string>();
  for (const target of config.targets) {
    if (target.status === "retired") continue;
    const locale =
      locales.find((l) => l.code === target.locale) ??
      locales.find((l) => l.isDefault) ??
      locales[0];
    const path = pathForPageSearchTarget(target);
    const canonical = buildCanonicalUrl(
      siteOrigin,
      locale?.urlPrefix ?? target.locale,
      path || "/",
      undefined,
      defaultPrefix,
    );
    targetCanonicalById.set(target.id, canonical);
  }

  const rows: KeywordOpportunityRow[] = [];
  const seen = new Set<string>();

  for (const [normalized, agg] of byQuery) {
    if (agg.impressions < threshold) continue;
    const keywordRecord =
      keywordsByNormOnly.get(normalized) ??
      [...keywordByNorm.values()].find((k) => k.normalizedKeyword === normalized);
    const displayKeyword =
      keywordRecord?.keyword ??
      metrics.find((m) => normalizeKeyword(m.query ?? "") === normalized)?.query ??
      normalized;

    let gapStatus: KeywordOpportunityGapStatus = "unassigned";
    let assignedEntity: string | null = null;
    let targetId: string | undefined;

    if (keywordRecord?.assignedEntity) {
      assignedEntity = `${keywordRecord.assignedEntity.type}:${keywordRecord.assignedEntity.id}`;
      const target =
        targetByEntityLocale.get(
          `${keywordRecord.locale}::${assignedEntity}`,
        ) ??
        config.targets.find(
          (t) =>
            (t.status === "active" || t.status === "draft") &&
            t.entity.type === keywordRecord.assignedEntity!.type &&
            t.entity.id === keywordRecord.assignedEntity!.id,
        );
      targetId = target?.id;
      const canonical = target ? targetCanonicalById.get(target.id) : undefined;
      const normalizedCanonical = canonical
        ? normalizeUrlForSiteMatch(canonical, siteOrigin)
        : null;
      const topUrl = [...agg.urls.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const urlAligned =
        Boolean(normalizedCanonical) &&
        Boolean(topUrl) &&
        (topUrl === normalizedCanonical ||
          (topUrl &&
            normalizedCanonical &&
            (topUrl.includes(normalizedCanonical) || normalizedCanonical.includes(topUrl))));

      const topicAligned =
        softIncludesPhrase(displayKeyword, target?.primaryTopic ?? keywordRecord.keyword, keywordRecord.locale) ||
        normalizeTopic(displayKeyword).includes(
          normalizeTopic(target?.primaryTopic ?? keywordRecord.keyword),
        );

      gapStatus = urlAligned || topicAligned ? "aligned" : "mismatch";
    } else {
      const matchingTarget = config.targets.find(
        (t) =>
          (t.status === "active" || t.status === "draft") &&
          (normalizeTopic(t.primaryTopic) === normalized ||
            softIncludesPhrase(displayKeyword, t.primaryTopic, t.locale)),
      );
      if (matchingTarget) {
        assignedEntity = `${matchingTarget.entity.type}:${matchingTarget.entity.id}`;
        targetId = matchingTarget.id;
        gapStatus = "aligned";
      }
    }

    const rowKey = `${normalized}::${assignedEntity ?? "none"}`;
    if (seen.has(rowKey)) continue;
    seen.add(rowKey);

    rows.push({
      keyword: displayKeyword,
      normalizedKeyword: normalized,
      assignedEntity,
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr: agg.impressions > 0 ? agg.clicks / agg.impressions : 0,
      position: agg.rows > 0 ? agg.positionSum / agg.rows : 0,
      gapStatus,
      locale: keywordRecord?.locale,
      keywordRecordId: keywordRecord?.id,
      targetId,
    });
  }

  rows.sort((a, b) => b.impressions - a.impressions);

  return {
    siteKey,
    siteOrigin,
    gscPropertyLabel,
    dateRangeDays: days,
    filters: { country: input.country, device: input.device },
    freshness: latest ? latest.toISOString() : null,
    caveats: [
      "GSC data is incomplete and may omit low-volume queries.",
      "Observed evidence only — not Keyword Planner volume.",
      "v1 filters: date range, country, and device only (no search type).",
      "Unassigned queries appear when no KeywordRecord or PageSearchTarget matches.",
    ],
    rows: rows.slice(0, 100),
  };
}
