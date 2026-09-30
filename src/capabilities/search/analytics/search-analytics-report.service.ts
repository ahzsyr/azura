import "server-only";

import type { SearchAnalyticsReport } from "@/capabilities/search/analytics/search-analytics.types";
import { readSearchAnalyticsRaw } from "@/capabilities/search/analytics/search-analytics-store.service";

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function filterLabel(key: string): string {
  const idx = key.indexOf(":");
  if (idx < 0) return key;
  return `${key.slice(0, idx)} (${key.slice(idx + 1)})`;
}

export async function buildSearchAnalyticsReport(
  locale: string,
  days = 30
): Promise<SearchAnalyticsReport> {
  const data = await readSearchAnalyticsRaw(locale);
  const cutoff = Date.now() - days * 86_400_000;

  const dailySeries = Object.entries(data.daily)
    .filter(([date]) => new Date(`${date}T12:00:00Z`).getTime() >= cutoff)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      searches: bucket.searches,
      zeroResults: bucket.zeroResults,
      clicks: bucket.clicks,
      conversions: bucket.conversions,
    }));

  const periodTotals = dailySeries.reduce(
    (acc, d) => ({
      searches: acc.searches + d.searches,
      zeroResults: acc.zeroResults + d.zeroResults,
      clicks: acc.clicks + d.clicks,
      conversions: acc.conversions + d.conversions,
      filterUses: acc.filterUses,
    }),
    { searches: 0, zeroResults: 0, clicks: 0, conversions: 0, filterUses: 0 }
  );

  const searches = periodTotals.searches || data.totals.searches;
  const clicks = periodTotals.clicks || data.totals.clicks;
  const conversions = periodTotals.conversions || data.totals.conversions;
  const zeroResults = periodTotals.zeroResults || data.totals.zeroResults;

  const topSearchTerms = Object.entries(data.queries)
    .filter(([, v]) => new Date(v.lastAt).getTime() >= cutoff)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([term, v]) => ({ term, count: v.count, lastAt: v.lastAt }));

  const noResultSearches = Object.entries(data.zeroQueries)
    .filter(([, v]) => new Date(v.lastAt).getTime() >= cutoff)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([term, v]) => ({ term, count: v.count, lastAt: v.lastAt }));

  const popularContent = Object.entries(data.content)
    .filter(([, v]) => new Date(v.lastAt).getTime() >= cutoff)
    .sort((a, b) => b[1].clicks - a[1].clicks)
    .slice(0, 12)
    .map(([key, v]) => ({
      key,
      title: v.title,
      urlPath: v.urlPath,
      entityType: v.entityType,
      clicks: v.clicks,
      conversions: v.conversions,
    }));

  const topFilters = Object.entries(data.filters)
    .filter(([, v]) => new Date(v.lastAt).getTime() >= cutoff)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([filterKey, v]) => ({
      filterKey,
      label: filterLabel(filterKey),
      count: v.count,
    }));

  return {
    locale,
    days,
    generatedAt: new Date().toISOString(),
    totals: {
      searches,
      zeroResults,
      clicks,
      conversions,
      filterUses: data.totals.filterUses,
      clickThroughRate: rate(clicks, searches),
      conversionRate: rate(conversions, clicks),
      zeroResultRate: rate(zeroResults, searches),
    },
    topSearchTerms,
    noResultSearches,
    popularContent,
    topFilters,
    dailySeries,
  };
}
