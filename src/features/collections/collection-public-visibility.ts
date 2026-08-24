import { collectionMapFromList, getChildCollections } from "./collection-navigation";
import type { Collection } from "./types";

export function hasCollectionProducts(count: number | undefined): boolean {
  return (count ?? 0) > 0;
}

/** Slugs that should appear in public hierarchy/nav (non-empty + their ancestors). */
export function buildPublicCollectionSlugs(
  collections: Collection[],
  counts: Map<string, number>,
): Set<string> {
  const bySlug = collectionMapFromList(collections);
  const present = new Set<string>();

  for (const col of collections) {
    if (!hasCollectionProducts(counts.get(col.slug))) continue;
    let cur: Collection | undefined = col;
    const seen = new Set<string>();
    while (cur) {
      if (seen.has(cur.slug)) break;
      seen.add(cur.slug);
      present.add(cur.slug);
      const parentSlug: string | undefined = cur.parentSlug?.trim() || undefined;
      cur = parentSlug && bySlug.has(parentSlug) ? bySlug.get(parentSlug) : undefined;
    }
  }

  return present;
}

export function collectionsForPublicHierarchy(
  collections: Collection[],
  counts: Map<string, number>,
): Collection[] {
  const present = buildPublicCollectionSlugs(collections, counts);
  return collections.filter((c) => present.has(c.slug));
}

export function filterPublicSubcollections(
  parentSlug: string,
  collections: Collection[],
  counts: Map<string, number>,
): Collection[] {
  const present = buildPublicCollectionSlugs(collections, counts);
  return getChildCollections(parentSlug, collections).filter((c) => present.has(c.slug));
}

export function filterPublicCollectionListingRecords<
  T extends { reviews_count?: number },
>(records: T[]): T[] {
  return records.filter((r) => hasCollectionProducts(r.reviews_count));
}
