import { z } from "zod";

export const BUILTIN_SEARCH_FILTER_IDS = [
  "contentType",
  "category",
  "collection",
  "tags",
  "price",
  "brand",
  "status",
  "date",
] as const;

export const searchBuiltinFilterIdSchema = z.enum(BUILTIN_SEARCH_FILTER_IDS);
export type SearchBuiltinFilterId = z.infer<typeof searchBuiltinFilterIdSchema>;

export const SEARCH_FILTER_UI_TYPES = ["chip", "multi", "select", "range", "date"] as const;
export const searchFilterUiTypeSchema = z.enum(SEARCH_FILTER_UI_TYPES);
export type SearchFilterUiType = z.infer<typeof searchFilterUiTypeSchema>;

export const BUILTIN_SEARCH_FILTER_LABELS: Record<SearchBuiltinFilterId, string> = {
  contentType: "Content type",
  category: "Categories",
  collection: "Collections",
  tags: "Tags",
  price: "Price",
  brand: "Brand",
  status: "Status",
  date: "Date",
};

export const BUILTIN_SEARCH_FILTER_DESCRIPTIONS: Record<SearchBuiltinFilterId, string> = {
  contentType: "Filter by catalog content type (packages, listings, …).",
  category: "Product or catalog category facets.",
  collection: "Content or product collection.",
  tags: "Tag facets from indexed documents.",
  price: "Price range (catalog products).",
  brand: "Brand facet (catalog products).",
  status: "Publication / visibility status.",
  date: "Published or updated date.",
};

/** Facet keys checked on SearchDocument metadata.facets (first match wins). */
export const BUILTIN_FILTER_FACET_KEYS: Record<SearchBuiltinFilterId, string[]> = {
  contentType: ["contentTypeSlug"],
  category: ["categories", "categorySlug", "category"],
  collection: ["collectionSlug", "collections"],
  tags: ["tags", "tag"],
  price: ["price", "priceMin", "priceMax"],
  brand: ["brand", "brandSlug"],
  status: ["status"],
  date: ["publishedAt", "updatedAt"],
};

export const DEFAULT_FILTER_DISPLAY_ORDER: string[] = [...BUILTIN_SEARCH_FILTER_IDS];

export function customFilterId(contentTypeSlug: string, fieldKey: string): string {
  return `custom:${contentTypeSlug}:${fieldKey}`;
}

export function parseCustomFilterId(id: string): { contentTypeSlug: string; fieldKey: string } | null {
  if (!id.startsWith("custom:")) return null;
  const parts = id.slice(7).split(":");
  if (parts.length < 2) return null;
  const fieldKey = parts.pop()!;
  const contentTypeSlug = parts.join(":");
  return { contentTypeSlug, fieldKey };
}

export function isBuiltinFilterId(id: string): id is SearchBuiltinFilterId {
  return searchBuiltinFilterIdSchema.safeParse(id).success;
}

export function normalizeFilterDisplayOrder(order: string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of order ?? []) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  for (const id of DEFAULT_FILTER_DISPLAY_ORDER) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}
