import { SearchEntityType } from "@prisma/client";
import type { DiscoveryItem } from "@/features/builder/blocks/discovery/lib/recently-viewed.types";
import type { ProductListingRecord } from "@/features/products/listing/types";

const EMPTY_LISTING_RECORD_BASE: Omit<
  ProductListingRecord,
  "slug" | "id" | "name" | "short_description" | "primary_image" | "brand" | "searchText"
> = {
  categories: [],
  tags: [],
  price: { value: 0, currency: "USD" },
  priceMin: 0,
  priceMax: 0,
  in_stock: true,
  conditions: [],
  variationFacets: {},
  collectionSlugs: [],
};

/** Map a discovery item to a minimal listing record for ProductListingCard. */
export function discoveryItemToListingRecord(item: DiscoveryItem): ProductListingRecord {
  const slug = item.entityId || item.id;
  return {
    ...EMPTY_LISTING_RECORD_BASE,
    slug,
    id: item.id,
    name: item.title,
    brand: item.badge,
    short_description: item.snippet,
    primary_image: item.imageUrl,
    searchText: [item.title, item.snippet, item.badge].filter(Boolean).join(" "),
  };
}

export function isCatalogProductDiscoveryItem(item: DiscoveryItem): boolean {
  return item.entityType === SearchEntityType.CATALOG_PRODUCT;
}

/** Prefer hydrated catalog record; fall back to minimal adapter shape. */
export function resolveDiscoveryCardRecord(
  item: DiscoveryItem,
  hydrated?: ProductListingRecord | null,
): ProductListingRecord {
  if (hydrated) return hydrated;
  return discoveryItemToListingRecord(item);
}

/** Build slug list for batch hydration of catalog products in discovery lists. */
export function catalogProductSlugsFromDiscoveryItems(items: DiscoveryItem[]): string[] {
  return items
    .filter(isCatalogProductDiscoveryItem)
    .map((item) => item.entityId)
    .filter(Boolean);
}
