import {
  COMPARE_ROUTE_ALIASES,
  resolveCompareContentTypeSlug,
} from "@/features/comparison/comparison-route-resolver";

export function findComparableTypeMeta<T extends { slug: string }>(
  types: T[],
  bucketSlug: string
): T | undefined {
  const canonical = resolveCompareContentTypeSlug(bucketSlug);
  return types.find(
    (t) => t.slug === canonical || resolveCompareContentTypeSlug(t.slug) === canonical
  );
}

/** Map bucket/type slugs (raw + canonical + legacy aliases) to comparable type metadata. */
export function buildComparableTypeBySlugMap<T extends { slug: string }>(
  types: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const t of types) {
    const canonical = resolveCompareContentTypeSlug(t.slug);
    map.set(t.slug, t);
    map.set(canonical, t);
    for (const [segment, target] of Object.entries(COMPARE_ROUTE_ALIASES)) {
      if (target === canonical) map.set(segment, t);
    }
  }
  return map;
}
