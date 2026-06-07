import type {
  ComposedSearchIndexPayload,
  ContentItemSearchSource,
  SearchIndexFieldSlice,
} from "@/features/search-framework/indexing/search-index-types";
import { isCustomFieldKey } from "@/features/search-framework/indexing/search-index-field-keys";

/** Stored on SearchDocument.metadata.rankingSignals for runtime scoring. */
export type SearchRankingSignalsSnapshot = {
  title?: string;
  description?: string;
  tags?: string;
  categories?: string;
  collections?: string;
  customFields?: string;
  featured?: boolean;
  popularity?: number;
  publishedAt?: string | null;
};

function joinSliceText(slices: SearchIndexFieldSlice[], keys: string[]): string {
  return slices
    .filter((s) => keys.includes(s.key) || keys.some((k) => s.key === k))
    .map((s) => s.text)
    .filter(Boolean)
    .join(" ");
}

function customFieldsText(slices: SearchIndexFieldSlice[]): string {
  return slices
    .filter((s) => isCustomFieldKey(s.key) || s.key === "custom_fields")
    .map((s) => s.text)
    .filter(Boolean)
    .join(" ");
}

export function buildRankingSignalsFromComposed(
  composed: ComposedSearchIndexPayload | undefined,
  source: Partial<ContentItemSearchSource>
): SearchRankingSignalsSnapshot {
  const slices = composed?.fieldSlices ?? [];
  const attrs = source.attributes ?? {};
  const meta = source.metadata ?? {};

  const tagsFromSource = Array.isArray(source.tags)
    ? source.tags.join(" ")
    : Array.isArray(attrs.tags)
      ? (attrs.tags as unknown[]).map(String).join(" ")
      : typeof attrs.tags === "string"
        ? attrs.tags
        : "";

  const categoriesFromSource = Array.isArray(source.categories)
    ? source.categories.join(" ")
    : joinSliceText(slices, ["categories"]);

  const collectionParts: string[] = [];
  if (source.collection) {
    collectionParts.push(source.collection.nameEn, source.collection.nameAr, source.collection.slug);
  }
  const collectionFromSlices = joinSliceText(slices, ["collections"]);

  const popularityRaw =
    typeof attrs.popularity === "number"
      ? attrs.popularity
      : typeof attrs.viewCount === "number"
        ? attrs.viewCount
        : typeof meta.popularity === "number"
          ? meta.popularity
          : undefined;

  const featured =
    source.isFeatured === true ||
    attrs.featured === true ||
    meta.featured === true;

  const publishedAt =
    source.publishedAt instanceof Date
      ? source.publishedAt.toISOString()
      : typeof source.publishedAt === "string"
        ? source.publishedAt
        : attrs.publishedAt
          ? String(attrs.publishedAt)
          : null;

  return {
    title: composed?.title,
    description:
      joinSliceText(slices, ["summary", "description", "content"]) ||
      [source.excerptEn, source.excerptAr, source.descriptionEn, source.descriptionAr]
        .filter(Boolean)
        .join(" "),
    tags: joinSliceText(slices, ["tags"]) || tagsFromSource || undefined,
    categories: categoriesFromSource || undefined,
    collections: [...collectionParts, collectionFromSlices].filter(Boolean).join(" ") || undefined,
    customFields: customFieldsText(slices) || undefined,
    featured,
    popularity:
      typeof popularityRaw === "number" && Number.isFinite(popularityRaw) ? popularityRaw : undefined,
    publishedAt,
  };
}

export function buildRankingSignalsFromRow(
  row: { title: string; body: string; metadata?: unknown },
  facets?: Record<string, unknown>
): SearchRankingSignalsSnapshot {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const stored = meta.rankingSignals as SearchRankingSignalsSnapshot | undefined;
  if (stored && typeof stored === "object") {
    return { ...stored, title: stored.title ?? row.title };
  }

  const f = facets ?? (meta.facets as Record<string, unknown>) ?? {};
  const tags = f.tags ?? f.tag;
  const categories = f.categories ?? f.categorySlug ?? f.category;
  const collections = f.collectionSlug ?? f.collections ?? f.contentTypeSlug;

  return {
    title: row.title,
    description: row.body,
    tags: Array.isArray(tags) ? tags.map(String).join(" ") : tags ? String(tags) : undefined,
    categories: Array.isArray(categories)
      ? categories.map(String).join(" ")
      : categories
        ? String(categories)
        : undefined,
    collections: Array.isArray(collections)
      ? collections.map(String).join(" ")
      : collections
        ? String(collections)
        : undefined,
    featured: meta.featured === true || f.featured === true,
    popularity:
      typeof meta.popularity === "number"
        ? meta.popularity
        : typeof f.popularity === "number"
          ? f.popularity
          : undefined,
    publishedAt:
      typeof meta.publishedAt === "string"
        ? meta.publishedAt
        : meta.publishedAt != null
          ? String(meta.publishedAt)
          : null,
  };
}
