import type { RankedHit } from "@/capabilities/search/engine/ranking/search-ranking-engine";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ProductCurrency } from "@/features/products/types";
import { applyProductOrdering } from "./apply-product-ordering";
import type { ProductOrderingSettings } from "./product-ordering.schema";
import { resolveProductOrderingProfile } from "./resolve-product-ordering-profile";

function asRecord(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function hitToListingRecord(hit: RankedHit): ProductListingRecord {
  const meta = asRecord(hit.metadata);
  const card = asRecord(meta.card);
  const slug =
    (typeof meta.slug === "string" && meta.slug) ||
    (typeof card.slug === "string" && card.slug) ||
    hit.entityId;
  const brand = typeof card.brand === "string" ? card.brand : undefined;
  const tags = asStringArray(meta.tags);
  const categories = asStringArray(meta.categories);
  const priceObj = asRecord(card.price);
  const priceMin = typeof priceObj.min === "number" ? priceObj.min : 0;
  const priceMax = typeof priceObj.max === "number" ? priceObj.max : priceMin;

  return {
    slug,
    id: hit.entityId,
    name: hit.title,
    brand,
    category: categories[0] ?? null,
    categories,
    tags,
    price: {
      value: priceMin,
      currency: (typeof priceObj.currency === "string"
        ? priceObj.currency
        : "USD") as ProductCurrency,
    },
    priceMin,
    priceMax,
    mpn: typeof meta.mpn === "string" ? meta.mpn : undefined,
    primary_image: typeof card.imageUrl === "string" ? card.imageUrl : undefined,
    in_stock: card.inStock !== false,
    conditions: [],
    variationFacets: {},
    collectionSlugs: categories,
    searchText: [hit.title, hit.body].filter(Boolean).join(" "),
  };
}

/**
 * Re-order CATALOG_PRODUCT hits with a SEARCH (or GLOBAL) ordering profile.
 * Product slots keep their ranked positions among non-products — only the
 * products themselves are permuted — so exact-title pages/services are not
 * buried under every matching SKU.
 */
export function applyProductOrderingToSearchHits(
  hits: RankedHit[],
  settings: ProductOrderingSettings | null | undefined,
): RankedHit[] {
  if (!hits.length || !settings) return hits;

  const profile = resolveProductOrderingProfile(settings, { surface: "SEARCH" });
  if (!profile) return hits;

  const productHits = hits.filter((hit) => hit.entityType === "CATALOG_PRODUCT");
  if (productHits.length <= 1) return hits;

  const records = productHits.map(hitToListingRecord);
  const ordered = applyProductOrdering(records, profile);
  const bySlug = new Map(productHits.map((h) => {
    const meta = asRecord(h.metadata);
    const card = asRecord(meta.card);
    const slug =
      (typeof meta.slug === "string" && meta.slug) ||
      (typeof card.slug === "string" && card.slug) ||
      h.entityId;
    return [slug.toLowerCase(), h] as const;
  }));

  const orderedQueue: RankedHit[] = [];
  for (const record of ordered) {
    const hit = bySlug.get(record.slug.toLowerCase());
    if (hit) orderedQueue.push(hit);
  }
  if (orderedQueue.length === 0) return hits;

  let qi = 0;
  return hits.map((hit) => {
    if (hit.entityType !== "CATALOG_PRODUCT") return hit;
    return orderedQueue[qi++] ?? hit;
  });
}
