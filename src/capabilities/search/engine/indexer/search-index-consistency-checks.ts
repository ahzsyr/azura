import { isPackagesContentTypeSlug } from "@/capabilities/search/settings/search-sources";
import { normalizeSearchHitTitle } from "@/capabilities/search/engine/filter/prefer-public-pages";
import { normalizeSearchPublicPath } from "@/capabilities/search/lib/search-public-path";

export type IndexedContentItemRow = {
  entityId: string;
  locale: string;
  title: string;
  urlPath: string;
  contentTypeSlug?: string | null;
};

export type LiveContentItemRef = {
  id: string;
  contentTypeSlug: string;
  titleByLocale: Record<string, string>;
  urlPathByLocale: Record<string, string>;
};

export type LiveCmsPageRef = {
  id: string;
  titleByLocale: Record<string, string>;
};

/** True when indexed contentTypeSlug differs from the live content type. */
export function hasContentTypeSlugMismatch(
  indexedSlug: string | null | undefined,
  liveSlug: string
): boolean {
  const indexed = indexedSlug?.trim() || "";
  return Boolean(indexed) && indexed !== liveSlug;
}

/** True when indexed title no longer matches the live source title for that locale. */
export function hasSearchTitleMismatch(
  indexedTitle: string | null | undefined,
  liveTitle: string | null | undefined
): boolean {
  const live = normalizeSearchHitTitle(liveTitle);
  if (!live) return false;
  return normalizeSearchHitTitle(indexedTitle) !== live;
}

/**
 * Count catalog-items docs that duplicate a preferred public identity
 * (same path or title as a published offerings/CMS page).
 */
export function countCatalogItemPublicDuplicates(input: {
  catalogItemDocs: IndexedContentItemRow[];
  preferredDocs: Array<{ title: string; urlPath: string; locale: string }>;
}): number {
  const preferred = new Set<string>();
  for (const doc of input.preferredDocs) {
    preferred.add(`${doc.locale}|path:${normalizeSearchPublicPath(doc.urlPath)}`);
    const title = normalizeSearchHitTitle(doc.title);
    if (title) preferred.add(`${doc.locale}|title:${title}`);
  }

  let count = 0;
  for (const doc of input.catalogItemDocs) {
    if (!isPackagesContentTypeSlug(doc.contentTypeSlug ?? "")) continue;
    const pathKey = `${doc.locale}|path:${normalizeSearchPublicPath(doc.urlPath)}`;
    const title = normalizeSearchHitTitle(doc.title);
    const titleKey = title ? `${doc.locale}|title:${title}` : "";
    if (preferred.has(pathKey) || (titleKey && preferred.has(titleKey))) {
      count += 1;
    }
  }
  return count;
}

export function compareLiveContentItemsToIndex(input: {
  liveItems: LiveContentItemRef[];
  indexedByKey: Map<string, IndexedContentItemRow>;
}): { contentTypeSlugMismatches: number; titleMismatches: number } {
  let contentTypeSlugMismatches = 0;
  let titleMismatches = 0;

  for (const item of input.liveItems) {
    for (const [locale, liveTitle] of Object.entries(item.titleByLocale)) {
      const key = `CONTENT_ITEM:${item.id}:${locale}`;
      const indexed = input.indexedByKey.get(key);
      if (!indexed) continue;
      if (hasContentTypeSlugMismatch(indexed.contentTypeSlug, item.contentTypeSlug)) {
        contentTypeSlugMismatches += 1;
      }
      if (hasSearchTitleMismatch(indexed.title, liveTitle)) {
        titleMismatches += 1;
      }
    }
  }

  return { contentTypeSlugMismatches, titleMismatches };
}

export function compareLiveCmsPagesToIndex(input: {
  livePages: LiveCmsPageRef[];
  indexedByKey: Map<string, { title: string }>;
}): { titleMismatches: number } {
  let titleMismatches = 0;
  for (const page of input.livePages) {
    for (const [locale, liveTitle] of Object.entries(page.titleByLocale)) {
      const key = `CMS_PAGE:${page.id}:${locale}`;
      const indexed = input.indexedByKey.get(key);
      if (!indexed) continue;
      if (hasSearchTitleMismatch(indexed.title, liveTitle)) {
        titleMismatches += 1;
      }
    }
  }
  return { titleMismatches };
}
