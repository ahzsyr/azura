/**
 * Normalize user input before building cache keys so `Phone`, ` phone`, `PHONE`
 * all map to the same cache entry.
 */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Stable JSON for facet/type filter objects used in query keys. */
export function normalizeFacetFilters(
  facets: Record<string, string[]> | undefined
): Record<string, string[]> {
  if (!facets) return {};
  const out: Record<string, string[]> = {};
  for (const key of Object.keys(facets).sort()) {
    const values = [...new Set(facets[key]?.map((v) => v.trim()).filter(Boolean) ?? [])].sort();
    if (values.length) out[key] = values;
  }
  return out;
}

export function normalizeEntityTypes(types: string[] | undefined): string[] {
  if (!types?.length) return [];
  return [...new Set(types.map((t) => t.trim()).filter(Boolean))].sort();
}
