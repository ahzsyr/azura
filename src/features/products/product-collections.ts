import type { Collection } from "@/features/collections/types";
import {
  catalogProductToCollectionProduct,
  matchProductToCollection,
  type CollectionEngineProduct,
} from "@/features/collections/engine";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import { collectionDepth } from "@/features/collections/collection-hierarchy";
import { matchesExact } from "@/features/collections/normalization";
import {
  buildCollectionRuleIndex,
  candidateCollectionSlugsFromIndex,
  filterCollectionsByCandidates,
  shouldUseCollectionRuleIndex,
} from "@/features/collections/collection-rule-index";
import type { Product as CatalogProduct } from "./types";

export type ProductLinkedTag = { label: string; href?: string };

function slugKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function localizedToEngineCollection(lc: Collection): Collection {
  return {
    id: lc.id,
    slug: lc.slug,
    name: lc.name,
    description: lc.description ?? "",
    badge: lc.badge,
    coverImage: lc.coverImage,
    iconImage: lc.iconImage,
    parentSlug: lc.parentSlug,
    seo: lc.seo,
    conditions: lc.conditions,
    cardTemplate: lc.cardTemplate,
    sortBy: lc.sortBy,
    visible: lc.visible !== false,
    showInNav: lc.showInNav,
    featured: lc.featured,
    tags: lc.tags,
    createdAt: lc.createdAt,
    updatedAt: lc.updatedAt,
  };
}

export function getCollectionsMatchingProduct(
  engineProduct: CollectionEngineProduct,
  localesCols: Collection[],
  options: { includeParents?: boolean } = {},
): Collection[] {
  let colsToEval = localesCols;
  if (shouldUseCollectionRuleIndex(localesCols.length)) {
    const index = buildCollectionRuleIndex(localesCols);
    const candidates = candidateCollectionSlugsFromIndex(index, engineProduct);
    colsToEval = filterCollectionsByCandidates(localesCols, candidates);
  }

  const directMatches = colsToEval.filter((lc) => {
    if (lc.visible === false) return false;
    return matchProductToCollection(engineProduct, localizedToEngineCollection(lc));
  });

  if (!options.includeParents || directMatches.length === 0) {
    return directMatches;
  }

  const bySlug = collectionMapFromList(localesCols);
  const resultSlugs = new Set(directMatches.map((c) => c.slug));

  for (const match of directMatches) {
    let cur = match.parentSlug?.trim();
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const parent = bySlug.get(cur);
      if (!parent) break;
      if (parent.visible !== false) resultSlugs.add(parent.slug);
      cur = parent.parentSlug?.trim();
    }
  }

  return localesCols.filter((c) => resultSlugs.has(c.slug));
}

export function getMatchingCollectionsBySpecificity(
  engineProduct: CollectionEngineProduct,
  localesCols: Collection[],
): Collection[] {
  const matches = getCollectionsMatchingProduct(engineProduct, localesCols);
  const bySlug = collectionMapFromList(localesCols);
  return matches
    .slice()
    .sort((a, b) => collectionDepth(b, bySlug) - collectionDepth(a, bySlug));
}

export function deriveProductKeywordLabels(product: {
  brand?: string | null;
  category?: string | null;
  categories?: string[] | null;
}): string[] {
  const out: string[] = [];
  const add = (s?: string | null) => {
    const t = typeof s === "string" ? s.trim() : "";
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  };
  add(product.brand ?? undefined);
  const cat = product.category != null ? String(product.category).trim() : "";
  add(cat || undefined);
  for (const c of product.categories ?? []) add(typeof c === "string" ? c : "");
  return out;
}

export function getDeepestMatchingCollectionSlug(
  engineProduct: CollectionEngineProduct,
  localesCols: Collection[],
): string | undefined {
  const ordered = getMatchingCollectionsBySpecificity(engineProduct, localesCols);
  return ordered[0]?.slug;
}

export function buildProductTagLinks(args: {
  catalogProduct: CatalogProduct;
  productSlug: string;
  localePrefix: string;
  allCollections: Collection[];
}): ProductLinkedTag[] {
  const { catalogProduct, productSlug, localePrefix, allCollections } = args;
  const engine = catalogProductToCollectionProduct(productSlug, catalogProduct);
  const base = `/${localePrefix.replace(/^\/+|\/+$/g, "")}/collections`;
  const ordered = getMatchingCollectionsBySpecificity(engine, allCollections);

  const chips: ProductLinkedTag[] = [];
  const seen = new Set<string>();

  const push = (label: string, href?: string) => {
    const k = slugKey(label);
    if (!k || seen.has(k)) return;
    seen.add(k);
    chips.push({ label, ...(href ? { href } : {}) });
  };

  for (const m of ordered) {
    if (m.visible === false) continue;
    push(m.name || m.slug, `${base}/${m.slug}`);
  }

  for (const label of deriveProductKeywordLabels(catalogProduct)) {
    let href: string | undefined;
    for (const c of allCollections) {
      if (c.visible === false) continue;
      const nameMatch = matchesExact(label, c.name || "");
      const slugGuess = slugKey(label);
      const slugMatch = Boolean(slugGuess && slugGuess === c.slug);
      if (!nameMatch && !slugMatch) continue;
      if (!matchProductToCollection(engine, localizedToEngineCollection(c))) continue;
      href = `${base}/${c.slug}`;
      break;
    }
    push(label, href);
  }

  return chips;
}

export interface OrphanProductInfo {
  slug: string;
  name: string;
  brand?: string;
  category?: string;
  categories: string[];
}

export function detectOrphanProducts(
  engineProducts: CollectionEngineProduct[],
  localesCols: Collection[],
): OrphanProductInfo[] {
  return engineProducts
    .filter((p) => !getCollectionsMatchingProduct(p, localesCols).length)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      categories: p.categories ?? [],
    }));
}

export interface AmbiguousMatch {
  productSlug: string;
  productName: string;
  candidateCollections: Array<{ slug: string; name: string; depth: number }>;
  reason: string;
}

export function detectAmbiguousMatches(
  engineProducts: CollectionEngineProduct[],
  localesCols: Collection[],
): AmbiguousMatch[] {
  const bySlug = collectionMapFromList(localesCols);
  const ambiguous: AmbiguousMatch[] = [];

  for (const product of engineProducts) {
    const matches = getCollectionsMatchingProduct(product, localesCols);
    if (matches.length < 2) continue;

    const byDepth = new Map<number, Collection[]>();
    for (const m of matches) {
      const d = collectionDepth(m, bySlug);
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(m);
    }

    const maxDepth = Math.max(...byDepth.keys());
    const deepest = byDepth.get(maxDepth) ?? [];
    if (deepest.length > 1) {
      ambiguous.push({
        productSlug: product.slug,
        productName: product.name,
        candidateCollections: deepest.map((c) => ({
          slug: c.slug,
          name: c.name,
          depth: maxDepth,
        })),
        reason: `Product matches ${deepest.length} collections at depth ${maxDepth}`,
      });
    }
  }

  return ambiguous;
}

export function buildCollectionProductCounts(
  engineProducts: CollectionEngineProduct[],
  localesCols: Collection[],
  options: { includeParents?: boolean } = {},
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const lc of localesCols) counts.set(lc.slug, 0);

  for (const product of engineProducts) {
    const matches = getCollectionsMatchingProduct(product, localesCols, options);
    for (const m of matches) {
      counts.set(m.slug, (counts.get(m.slug) ?? 0) + 1);
    }
  }

  return counts;
}