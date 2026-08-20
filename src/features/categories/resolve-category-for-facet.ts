/**
 * Resolve product category facet candidates against the Category taxonomy SoT
 * (Collection dual-read shape until Stage 7).
 *
 * Product.category / categoryIds / name|slug → Category → Category.visible
 *
 * FILTERS → Category options must come from settings Categories only.
 * Unresolved free-text does not emit.
 */

export type CategoryTaxonomyNode = {
  id: string;
  slug: string;
  name: string;
  visible?: boolean;
};

export type CategoryFacetResolveInput = {
  /** Free-text / facet value (product.category, categories[], or slug). */
  value?: string | null;
  /** Canonical category ids from product.categoryIds when present. */
  categoryIds?: string[] | null;
  /** Materialized membership slugs (record.collectionSlugs). */
  collectionSlugs?: string[] | null;
};

export type CategoryFacetIndex = {
  byId: Map<string, CategoryTaxonomyNode>;
  bySlug: Map<string, CategoryTaxonomyNode>;
  byName: Map<string, CategoryTaxonomyNode>;
};

/** Normalize taxonomy / facet keys for case-insensitive, whitespace-collapsed match. */
export function normalizeCategoryFacetKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildCategoryFacetIndex(
  taxonomy: CategoryTaxonomyNode[],
): CategoryFacetIndex {
  const byId = new Map<string, CategoryTaxonomyNode>();
  const bySlug = new Map<string, CategoryTaxonomyNode>();
  const byName = new Map<string, CategoryTaxonomyNode>();
  for (const node of taxonomy) {
    if (node.id) {
      byId.set(node.id, node);
      byId.set(normalizeCategoryFacetKey(node.id), node);
    }
    if (node.slug) {
      bySlug.set(node.slug, node);
      bySlug.set(normalizeCategoryFacetKey(node.slug), node);
    }
    if (node.name) {
      byName.set(node.name, node);
      byName.set(normalizeCategoryFacetKey(node.name), node);
    }
  }
  return { byId, bySlug, byName };
}

/** Resolve a single facet candidate to a taxonomy node (id, then slug, then name). */
export function resolveCategoryForFacetValue(
  value: string,
  index: CategoryFacetIndex,
): CategoryTaxonomyNode | null {
  const raw = value.trim();
  if (!raw) return null;
  const norm = normalizeCategoryFacetKey(raw);
  return (
    index.byId.get(raw) ??
    index.byId.get(norm) ??
    index.bySlug.get(raw) ??
    index.bySlug.get(norm) ??
    index.byName.get(raw) ??
    index.byName.get(norm) ??
    null
  );
}

/**
 * Resolve product category fields to taxonomy nodes.
 * Prefers categoryIds; also resolves free-text value and membership slugs.
 */
export function resolveCategoriesForProductFacet(
  input: CategoryFacetResolveInput,
  index: CategoryFacetIndex,
): CategoryTaxonomyNode[] {
  const out: CategoryTaxonomyNode[] = [];
  const seen = new Set<string>();

  const push = (node: CategoryTaxonomyNode | null) => {
    if (!node) return;
    const key = node.id || node.slug || node.name;
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(node);
  };

  for (const id of input.categoryIds ?? []) {
    if (typeof id !== "string" || !id.trim()) continue;
    push(resolveCategoryForFacetValue(id, index));
  }

  if (input.value != null && String(input.value).trim()) {
    push(resolveCategoryForFacetValue(String(input.value), index));
  }

  for (const slug of input.collectionSlugs ?? []) {
    if (typeof slug !== "string" || !slug.trim()) continue;
    push(resolveCategoryForFacetValue(slug, index));
  }

  return out;
}

/**
 * True when the facet value may be emitted.
 * Unresolved free-text is NOT visible — settings Categories own FILTERS.
 */
export function isCategoryFacetValueVisible(
  value: string,
  index: CategoryFacetIndex,
): boolean {
  const resolved = resolveCategoryForFacetValue(value, index);
  if (!resolved) return false;
  return resolved.visible !== false;
}

export function isCategoryTaxonomyNodeVisible(node: CategoryTaxonomyNode): boolean {
  return node.visible !== false;
}

/** Whether a listing record should count toward a selected Category facet value. */
export function recordMatchesCategoryFacetValue(
  record: {
    category?: string | null;
    categoryIds?: string[] | null;
    collectionSlugs?: string[] | null;
  },
  selectedValue: string,
  index: CategoryFacetIndex,
): boolean {
  const selected = resolveCategoryForFacetValue(selectedValue, index);
  if (!selected || selected.visible === false) return false;

  const hits = resolveCategoriesForProductFacet(
    {
      value: record.category,
      categoryIds: record.categoryIds,
      collectionSlugs: record.collectionSlugs,
    },
    index,
  );
  return hits.some((n) => (n.id && n.id === selected.id) || n.slug === selected.slug);
}
