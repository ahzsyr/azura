import { buildSearchAnalyticsReport } from "@/features/search/analytics/search-analytics-report.service";

type EntityKey = string;

let cachedScores: Map<EntityKey, { clickRate: number; conversionRate: number }> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getSearchAnalyticsEntityScores(
  locale = "en"
): Promise<Map<EntityKey, { clickRate: number; conversionRate: number }>> {
  const now = Date.now();
  if (cachedScores && now - cachedAt < CACHE_TTL_MS) {
    return cachedScores;
  }

  const map = new Map<EntityKey, { clickRate: number; conversionRate: number }>();
  try {
    const report = await buildSearchAnalyticsReport(locale);
    const maxMetric = Math.max(
      1,
      ...report.popularContent.map((c) => Math.max(c.clicks, c.conversions))
    );

    for (const row of report.popularContent) {
      const parts = row.key.split(":");
      if (parts.length < 2) continue;
      const entityType = parts[0];
      const entityId = parts.slice(1).join(":");
      const key = `${entityType}:${entityId}`;
      map.set(key, {
        clickRate: row.clicks / maxMetric,
        conversionRate: row.conversions / maxMetric,
      });
    }
  } catch {
    /* analytics optional */
  }

  cachedScores = map;
  cachedAt = now;
  return map;
}

export function analyticsBoostForEntity(
  entityType: string,
  entityId: string,
  scores: Map<EntityKey, { clickRate: number; conversionRate: number }>
): number {
  const key = `${entityType}:${entityId}`;
  const row = scores.get(key);
  if (!row) return 0;
  return row.clickRate * 2 + row.conversionRate * 3;
}
