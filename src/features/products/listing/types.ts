import type { ProductAvailability, ProductCurrency, ProductPrice, ProductStockStatus } from "../types";

export const LISTING_PER_OPTIONS = [10, 20, 30, 50] as const;
export type ListingPerPage = (typeof LISTING_PER_OPTIONS)[number];

export type ProductListingRecord = {
  slug: string;
  id: string;
  name: string;
  brand?: string;
  category?: string | null;
  categories: string[];
  tags: string[];
  price: ProductPrice;
  old_price?: number | null;
  priceMin: number;
  priceMax: number;
  short_description?: string;
  availability?: ProductAvailability;
  stock_status?: ProductStockStatus;
  mpn?: string;
  rating?: number;
  reviews_count?: number;
  primary_image?: string;
  secondary_image?: string;
  /** Up to 4 gallery URLs for card hover/swipe (excludes duplicate of primary). */
  gallery_images?: string[];
  in_stock: boolean;
  conditions: string[];
  variationFacets: Record<string, string[]>;
  collectionSlugs: string[];
  searchText: string;
  /** Catalog publish status (`published`, `draft`, `archived`, …). */
  status?: string;
  /** Snippet text for search result cards (respects PDP visibility). */
  displaySnippet?: string;
  /** Per-product search card field visibility (respects PDP + site settings). */
  searchCardDisplay?: {
    showBrand: boolean;
    showPrice: boolean;
    showRating: boolean;
    showSnippet: boolean;
    showImage: boolean;
  };
  /** Per-product override for external shop URL slug segment. */
  buy_now_slug?: string;
};

export type FacetOption = { value: string; label: string; count: number };

export type CollectionFacetOption = FacetOption & { slug: string; depth: number };

export type ListingFacets = {
  collections: CollectionFacetOption[];
  categories: FacetOption[];
  brands: FacetOption[];
  tags: FacetOption[];
  conditions: FacetOption[];
  variations: Record<string, FacetOption[]>;
  priceMin: number;
  priceMax: number;
  currency: ProductCurrency;
};

export type ListingFilterState = {
  q: string;
  categories: string[];
  brands: string[];
  collections: string[];
  collectionScope: string | null;
  tags: string[];
  conditions: string[];
  variations: Record<string, string[]>;
  priceMin: number | null;
  priceMax: number | null;
  stockOnly: boolean;
  page: number;
  per: ListingPerPage;
};

export type ProductListingCatalogPayload = {
  records: ProductListingRecord[];
  facets: ListingFacets;
  total?: number;
  page?: number;
  per?: number;
  totalPages?: number;
};