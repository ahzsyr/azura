import { z } from "zod";

export const SEARCH_RANKING_SIGNALS = [
  "title",
  "description",
  "tags",
  "category",
  "collection",
  "customField",
  "popularity",
  "featured",
  "recent",
] as const;

export const searchRankingSignalSchema = z.enum(SEARCH_RANKING_SIGNALS);
export type SearchRankingSignalId = z.infer<typeof searchRankingSignalSchema>;

export const SEARCH_RANKING_SIGNAL_LABELS: Record<SearchRankingSignalId, string> = {
  title: "Title",
  description: "Description",
  tags: "Tags",
  category: "Category",
  collection: "Collection",
  customField: "Custom field",
  popularity: "Popularity",
  featured: "Featured",
  recent: "Recent content",
};

export const SEARCH_RANKING_SIGNAL_DESCRIPTIONS: Record<SearchRankingSignalId, string> = {
  title: "Match strength in the document title.",
  description: "Matches in summary, excerpt, and description fields.",
  tags: "Matches in tag facets and indexed tag text.",
  category: "Matches in category labels and slugs.",
  collection: "Matches in collection names and slugs.",
  customField: "Matches in custom attribute fields indexed for search.",
  popularity: "Boost from popularity / view signals when indexed.",
  featured: "Extra boost when the item is marked featured.",
  recent: "Boost for newer published content.",
};

export const DEFAULT_RANKING_PRIORITY_ORDER: SearchRankingSignalId[] = [
  ...SEARCH_RANKING_SIGNALS,
];

export const DEFAULT_RANKING_WEIGHTS: Record<SearchRankingSignalId, number> = {
  title: 3,
  description: 2,
  tags: 1.5,
  category: 1.5,
  collection: 1.5,
  customField: 1,
  popularity: 1,
  featured: 2,
  recent: 1,
};

export function normalizeRankingPriorityOrder(
  order: string[] | undefined
): SearchRankingSignalId[] {
  const seen = new Set<SearchRankingSignalId>();
  const result: SearchRankingSignalId[] = [];
  for (const id of order ?? []) {
    if (!searchRankingSignalSchema.safeParse(id).success) continue;
    const sid = id as SearchRankingSignalId;
    if (seen.has(sid)) continue;
    seen.add(sid);
    result.push(sid);
  }
  for (const id of SEARCH_RANKING_SIGNALS) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}

export function normalizeRankingWeights(
  raw: Partial<Record<string, number>> | undefined,
  legacyTitleWeight?: number
): Record<SearchRankingSignalId, number> {
  const out = { ...DEFAULT_RANKING_WEIGHTS };
  if (typeof legacyTitleWeight === "number" && Number.isFinite(legacyTitleWeight)) {
    out.title = Math.min(10, Math.max(0, legacyTitleWeight));
  }
  if (raw) {
    for (const id of SEARCH_RANKING_SIGNALS) {
      const v = raw[id];
      if (typeof v === "number" && Number.isFinite(v)) {
        out[id] = Math.min(10, Math.max(0, v));
      }
    }
  }
  return out;
}
