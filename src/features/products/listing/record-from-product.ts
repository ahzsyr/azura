import type { Collection } from "@/features/collections/types";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import {
  deriveProductKeywordLabels,
  getCollectionsMatchingProduct,
} from "@/features/products/product-collections";
import type { Product, ProductVariationCombination } from "@/features/products/types";
import type { IndexedProductListingRecord } from "@/features/products/index/product-index-types";
import { normalizeRemoteImageUrl } from "@/lib/config/next-image";
import type { ProductListingRecord } from "./types";

function normTag(s: string): string {
  return s.trim().toLowerCase();
}

function mergeTags(explicit: string[] | undefined, derived: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const k = normTag(t);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const t of explicit ?? []) add(t);
  for (const t of derived) add(t);
  return out;
}

function comboPrice(combo: ProductVariationCombination, base: number): number | null {
  if (combo.price != null && Number.isFinite(Number(combo.price))) {
    return Number(combo.price);
  }
  if (typeof combo.price_adjustment === "number" && Number.isFinite(combo.price_adjustment)) {
    return base + combo.price_adjustment;
  }
  return null;
}

export function priceBoundsFromProduct(product: Product): { min: number; max: number } {
  const base = Number(product.price?.value ?? 0);
  let min = base;
  let max = base;
  for (const combo of product.variation_combinations ?? []) {
    const p = comboPrice(combo, base);
    if (p != null) {
      min = Math.min(min, p);
      max = Math.max(max, p);
    }
  }
  return { min, max };
}

export function collectConditionsFromProduct(product: Product): string[] {
  const set = new Set<string>();
  for (const c of product.condition_options ?? []) {
    if (c) set.add(c);
  }
  for (const v of product.variations ?? []) {
    if (/condition/i.test(v.type ?? "")) {
      for (const o of v.options ?? []) {
        const label = typeof o === "string" ? o : "";
        if (label) set.add(label);
      }
    }
  }
  return [...set];
}

export function collectVariationFacetsFromProduct(product: Product): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const v of product.variations ?? []) {
    const type = (v.type ?? "").trim();
    if (!type || /condition/i.test(type)) continue;
    const opts = (v.options ?? []).map((o) => (typeof o === "string" ? o.trim() : "")).filter(Boolean);
    if (opts.length) out[type] = opts;
  }
  return out;
}

export function buildListingSearchText(parts: string[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function recordFromProduct(
  product: Product,
  slug: string,
  collections: Collection[],
): IndexedProductListingRecord {
  const name = product.name || product.productTitle || product.title || slug;
  const images = product.media?.images ?? [];
  const primaryImage = images.find((img) => img.type === "main")?.url || images[0]?.url;
  const secondaryImage = images.find((img) => img.url && img.type !== "main")?.url;
  const gallery_images = images
    .map((img) => img.url)
    .filter((url): url is string => Boolean(url))
    .slice(0, 4)
    .map((url) => normalizeRemoteImageUrl(url) ?? url);
  const out =
    product.stock_status === "out_of_stock" || product.availability === "OutOfStock";

  const catSet = new Set<string>();
  const cat = product.category != null ? String(product.category).trim() : "";
  if (cat) catSet.add(cat);
  for (const c of product.categories ?? []) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) catSet.add(s);
  }
  const categories = [...catSet];

  const engine = catalogProductToCollectionProduct(slug, product);
  const matches = getCollectionsMatchingProduct(engine, collections, { includeParents: true });
  const collectionSlugs = matches.map((c) => c.slug);
  const derivedLabels = deriveProductKeywordLabels(product);
  const collectionNames = matches.map((c) => c.name).filter(Boolean);
  const tags = mergeTags(product.tags, [...derivedLabels, ...collectionNames]);

  const { min: priceMin, max: priceMax } = priceBoundsFromProduct(product);

  const ratingRaw = Number(product.reviews?.rating ?? 0);
  const rating = Number.isFinite(ratingRaw) ? ratingRaw : 0;
  const countRaw = Number(product.reviews?.count ?? 0);
  const reviews_count = Number.isFinite(countRaw) ? Math.max(0, Math.floor(countRaw)) : 0;

  const searchText = buildListingSearchText([
    name,
    product.brand ?? "",
    product.mpn ?? "",
    product.manufacturer_part_number ?? "",
    cat,
    ...categories,
    product.short_description ?? "",
    product.description ?? "",
    ...tags,
  ]);

  const localization = product.localization as
    | { translation_status?: string; uses_source_fallback?: boolean }
    | undefined;

  return {
    slug,
    id: product.id,
    name,
    brand: product.brand,
    category: product.category,
    categories,
    tags,
    price: product.price,
    old_price: product.old_price ?? undefined,
    priceMin,
    priceMax,
    short_description: product.short_description,
    availability: product.availability,
    stock_status: product.stock_status,
    mpn: product.mpn || product.manufacturer_part_number,
    rating,
    reviews_count,
    primary_image: normalizeRemoteImageUrl(primaryImage),
    secondary_image: normalizeRemoteImageUrl(secondaryImage),
    gallery_images: gallery_images.length > 1 ? gallery_images : undefined,
    in_stock: !out,
    conditions: collectConditionsFromProduct(product),
    variationFacets: collectVariationFacetsFromProduct(product),
    collectionSlugs,
    searchText,
    sortName: name.toLowerCase(),
    sortPrice: priceMin,
    usesSourceFallback:
      localization?.uses_source_fallback === true ||
      localization?.translation_status === "pending" ||
      localization?.translation_status === "draft",
  };
}

export function listingRecordToRuleMeta(record: ProductListingRecord) {
  return {
    slug: record.slug,
    id: String(record.id ?? record.slug).trim() || record.slug,
    name: record.name,
    brand: record.brand ?? "",
    category: record.category != null ? String(record.category) : "",
    categories: record.categories,
    tags: record.tags,
    status: record.availability ?? "",
    stock: record.in_stock ? "in-stock" : "out-of-stock",
  };
}
