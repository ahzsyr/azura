import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SearchEntityType } from "@prisma/client";
import type {
  SearchAnalyticsDailyBucket,
  SearchAnalyticsFile,
} from "@/features/search/analytics/search-analytics.types";

const ANALYTICS_DIR = join(process.cwd(), "data", "search-analytics");
const MAX_QUERY_KEYS = 2000;
const MAX_CONTENT_KEYS = 500;
const MAX_FILTER_KEYS = 200;

function analyticsPath(locale: string): string {
  const safe = locale.replace(/[^a-z0-9-]/gi, "_") || "default";
  return join(ANALYTICS_DIR, `${safe}.json`);
}

function emptyBucket(): SearchAnalyticsDailyBucket {
  return {
    searches: 0,
    zeroResults: 0,
    clicks: 0,
    conversions: 0,
    filterUses: 0,
  };
}

function emptyFile(): SearchAnalyticsFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    queries: {},
    zeroQueries: {},
    content: {},
    filters: {},
    daily: {},
    totals: emptyBucket(),
  };
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().slice(0, 200);
}

function contentKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function filterKey(filterId: string, values: string[]): string {
  const vals = values.map((v) => v.trim()).filter(Boolean).sort().join(",");
  return vals ? `${filterId}:${vals}` : filterId;
}

async function readFileData(locale: string): Promise<SearchAnalyticsFile> {
  try {
    const raw = await readFile(analyticsPath(locale), "utf-8");
    const parsed = JSON.parse(raw) as SearchAnalyticsFile;
    if (parsed?.version === 1 && parsed.totals) return parsed;
  } catch {
    /* new file */
  }
  return emptyFile();
}

async function writeFileData(locale: string, data: SearchAnalyticsFile): Promise<void> {
  await mkdir(ANALYTICS_DIR, { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(analyticsPath(locale), JSON.stringify(data, null, 2), "utf-8");
}

function bumpDaily(data: SearchAnalyticsFile, patch: Partial<SearchAnalyticsDailyBucket>): void {
  const key = dayKey();
  const day = data.daily[key] ?? emptyBucket();
  for (const k of Object.keys(patch) as (keyof SearchAnalyticsDailyBucket)[]) {
    const v = patch[k];
    if (typeof v === "number") {
      day[k] += v;
      data.totals[k] += v;
    }
  }
  data.daily[key] = day;
}

function pruneOldDays(data: SearchAnalyticsFile, retentionDays: number): void {
  const cutoff = Date.now() - retentionDays * 86_400_000;
  for (const key of Object.keys(data.daily)) {
    if (new Date(`${key}T12:00:00Z`).getTime() < cutoff) {
      delete data.daily[key];
    }
  }
}

function capRecord<T>(record: Record<string, T>, max: number, sortKeys: (keys: string[]) => string[]): void {
  const keys = Object.keys(record);
  if (keys.length <= max) return;
  for (const drop of sortKeys(keys).slice(max)) {
    delete record[drop];
  }
}

export async function recordSearchAnalyticsQuery(
  locale: string,
  q: string,
  resultCount: number,
  retentionDays = 90
): Promise<void> {
  const term = normalizeQuery(q);
  if (term.length < 2) return;

  const data = await readFileData(locale);
  const prev = data.queries[term];
  data.queries[term] = {
    count: (prev?.count ?? 0) + 1,
    zeroCount: (prev?.zeroCount ?? 0) + (resultCount === 0 ? 1 : 0),
    clicks: prev?.clicks ?? 0,
    lastAt: new Date().toISOString(),
  };

  if (resultCount === 0) {
    const z = data.zeroQueries[term];
    data.zeroQueries[term] = {
      count: (z?.count ?? 0) + 1,
      lastAt: new Date().toISOString(),
    };
    bumpDaily(data, { searches: 1, zeroResults: 1 });
  } else {
    bumpDaily(data, { searches: 1 });
  }

  capRecord(data.queries, MAX_QUERY_KEYS, (keys) =>
    keys.sort(
      (a, b) =>
        new Date(data.queries[a].lastAt).getTime() - new Date(data.queries[b].lastAt).getTime()
    )
  );
  capRecord(data.zeroQueries, MAX_QUERY_KEYS, (keys) =>
    keys.sort(
      (a, b) =>
        new Date(data.zeroQueries[a].lastAt).getTime() -
        new Date(data.zeroQueries[b].lastAt).getTime()
    )
  );

  pruneOldDays(data, retentionDays);
  await writeFileData(locale, data);
}

export async function recordSearchAnalyticsClick(params: {
  locale: string;
  q: string;
  entityType: SearchEntityType;
  entityId: string;
  title?: string;
  urlPath: string;
  retentionDays?: number;
}): Promise<void> {
  const term = normalizeQuery(params.q);
  const data = await readFileData(params.locale);
  const ck = contentKey(params.entityType, params.entityId);

  if (term.length >= 2) {
    const prev = data.queries[term];
    if (prev) {
      prev.clicks = (prev.clicks ?? 0) + 1;
      prev.lastAt = new Date().toISOString();
    }
  }

  const content = data.content[ck] ?? {
    entityType: params.entityType,
    entityId: params.entityId,
    title: params.title ?? params.urlPath,
    urlPath: params.urlPath,
    clicks: 0,
    conversions: 0,
    lastAt: new Date().toISOString(),
  };
  content.clicks += 1;
  content.conversions += 1;
  content.title = params.title ?? content.title;
  content.urlPath = params.urlPath;
  content.lastAt = new Date().toISOString();
  data.content[ck] = content;

  bumpDaily(data, { clicks: 1, conversions: 1 });

  capRecord(data.content, MAX_CONTENT_KEYS, (keys) =>
    keys.sort(
      (a, b) =>
        new Date(data.content[a].lastAt).getTime() - new Date(data.content[b].lastAt).getTime()
    )
  );

  pruneOldDays(data, params.retentionDays ?? 90);
  await writeFileData(params.locale, data);
}

export async function recordSearchAnalyticsFilter(params: {
  locale: string;
  filterId: string;
  values: string[];
  retentionDays?: number;
}): Promise<void> {
  const key = filterKey(params.filterId, params.values);
  const data = await readFileData(params.locale);
  const prev = data.filters[key];
  data.filters[key] = {
    count: (prev?.count ?? 0) + 1,
    lastAt: new Date().toISOString(),
  };
  bumpDaily(data, { filterUses: 1 });
  capRecord(data.filters, MAX_FILTER_KEYS, (keys) =>
    keys.sort(
      (a, b) =>
        new Date(data.filters[a].lastAt).getTime() - new Date(data.filters[b].lastAt).getTime()
    )
  );
  pruneOldDays(data, params.retentionDays ?? 90);
  await writeFileData(params.locale, data);
}

/** Trending autocomplete — top queries by recent volume. */
export async function getTrendingSearchQueries(
  locale: string,
  limit = 8,
  adminOverride: string[] = []
): Promise<string[]> {
  if (adminOverride.length) return adminOverride.slice(0, limit);
  const data = await readFileData(locale);
  const cutoff = Date.now() - 30 * 86_400_000;
  return Object.entries(data.queries)
    .filter(([, v]) => new Date(v.lastAt).getTime() >= cutoff)
    .sort((a, b) => b[1].count - a[1].count || b[1].lastAt.localeCompare(a[1].lastAt))
    .map(([q]) => q)
    .slice(0, limit);
}

/** Legacy alias used by trending sink. */
export async function recordSearchQuery(locale: string, q: string): Promise<void> {
  await recordSearchAnalyticsQuery(locale, q, 1);
}

export async function readSearchAnalyticsRaw(locale: string): Promise<SearchAnalyticsFile> {
  return readFileData(locale);
}
