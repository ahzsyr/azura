import type { ListingFacets, ProductListingRecord } from "./types";

export type CatalogInteractiveRecord = {
  slug: string;
  id: string;
  name: string;
  brand?: string;
  category?: string | null;
  categories: string[];
  tags: string[];
  price: ProductListingRecord["price"];
  old_price?: number | null;
  priceMin: number;
  priceMax: number;
  short_description?: string;
  primary_image?: string;
  secondary_image?: string;
  in_stock: boolean;
  conditions: string[];
  variationFacets: Record<string, string[]>;
  collectionSlugs: string[];
  searchText: string;
  rating?: number;
  reviews_count?: number;
  searchTokens: string[];
  sortKeys: {
    name: string;
    price: number;
    items: number;
  };
};

export type CatalogInteractiveDataset = {
  records: CatalogInteractiveRecord[];
  facets: ListingFacets;
  total: number;
  totalPages: number;
  meta: {
    payloadBytes: number;
    payloadMb: number;
  };
};

const TOKEN_RE = /[^-\p{L}\p{N}]+/gu;

export function tokenizeListingText(text: string): string[] {
  const out = new Set<string>();
  for (const token of text.toLowerCase().replace(TOKEN_RE, " ").split(/\s+/)) {
    if (token.length >= 2) out.add(token);
  }
  return Array.from(out);
}

export function toCatalogInteractiveRecord(record: ProductListingRecord): CatalogInteractiveRecord {
  return {
    slug: record.slug,
    id: record.id,
    name: record.name,
    brand: record.brand,
    category: record.category,
    categories: record.categories ?? [],
    tags: record.tags ?? [],
    price: record.price,
    old_price: record.old_price,
    priceMin: record.priceMin,
    priceMax: record.priceMax,
    short_description: record.short_description,
    primary_image: record.primary_image,
    secondary_image: record.secondary_image,
    in_stock: record.in_stock,
    conditions: record.conditions ?? [],
    variationFacets: record.variationFacets ?? {},
    collectionSlugs: record.collectionSlugs ?? [],
    searchText: record.searchText ?? "",
    rating: record.rating,
    reviews_count: record.reviews_count,
    searchTokens: tokenizeListingText(record.searchText ?? ""),
    sortKeys: {
      name: (record.name ?? "").toLowerCase(),
      price: record.priceMin ?? 0,
      items: record.reviews_count ?? 0,
    },
  };
}

export function toProductListingRecord(record: CatalogInteractiveRecord): ProductListingRecord {
  return {
    slug: record.slug,
    id: record.id,
    name: record.name,
    brand: record.brand,
    category: record.category,
    categories: record.categories,
    tags: record.tags,
    price: record.price,
    old_price: record.old_price,
    priceMin: record.priceMin,
    priceMax: record.priceMax,
    short_description: record.short_description,
    primary_image: record.primary_image,
    secondary_image: record.secondary_image,
    in_stock: record.in_stock,
    conditions: record.conditions,
    variationFacets: record.variationFacets,
    collectionSlugs: record.collectionSlugs,
    searchText: record.searchText,
    rating: record.rating,
    reviews_count: record.reviews_count,
  };
}

export function estimateInteractivePayloadBytes(dataset: Omit<CatalogInteractiveDataset, "meta">): number {
  return new TextEncoder().encode(JSON.stringify(dataset)).length;
}

