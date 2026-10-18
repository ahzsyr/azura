import "server-only";

import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { Collection } from "@/features/collections/types";
import { matchPublishedProductsToRules } from "@/features/categories/direct-rule-match.service";
import { loadCollectionProductCounts } from "@/features/collections/collection-product-counts";
import { filterPublicCollectionListingRecords } from "@/features/collections/collection-public-visibility";
import { collectionMapFromList, isCollectionImageSrc, resolveCollectionImages } from "@/features/collections/collection-navigation";
import { productsDataService } from "@/features/products/products-data.service";
import { useCatalogProductsDb } from "@/features/products/products-source";
import {
  hasProductListingIndex,
  loadFacetIndex,
  loadListingRecords,
  loadListingRecordsForSlugs,
} from "@/features/products/index/product-index-loader";
import { buildListingSearchText, recordFromProduct } from "@/features/products/listing/record-from-product";
import { queryProductListing, sortListingRecords } from "@/features/products/listing/query-listing";
import { countActiveFilters } from "@/features/products/listing/url-state";
import {
  applyProductOrdering,
  resolveProductOrderingProfile,
} from "@/features/products/ordering";
import { loadProductOrderingSettings } from "@/features/products/ordering/load-product-ordering";
import { aggregateFacets, applyCategoryVisibilityToFacets } from "./aggregate-facets";
import type {
  ListingFilterState,
  ProductListingCatalogPayload,
  ProductListingRecord,
} from "./types";

/** Full taxonomy including hidden — required for Category.visible facet suppression. */
async function loadAllCollections(localePrefix: string, preloaded?: Collection[]): Promise<Collection[]> {
  if (preloaded) return preloaded;
  const allCols = await collectionsDataService.loadAll({ localePrefix });
  return orderCollectionsHierarchy(allCols);
}

type CatalogBuildOptions = {
  collections?: Collection[];
  productCounts?: Map<string, number>;
};

/** Products that match this category's own rules. Ignores stale collection indexes and parent rollup. */
async function scopeRecordsToCollectionRules(
  localePrefix: string,
  collection: Collection,
  collections: Collection[],
): Promise<ProductListingRecord[]> {
  const matched = await matchPublishedProductsToRules(localePrefix, collection.conditions, {
    sampleLimit: 1,
  });
  const want = new Set(matched.slugs);
  if (want.size === 0) return [];

  const useIndex = useCatalogProductsDb() || (await hasProductListingIndex(localePrefix));
  const scoped: ProductListingRecord[] = [];
  if (useIndex) {
    const indexed = await loadListingRecordsForSlugs(localePrefix, want);
    for (const record of indexed) {
      if (want.has(record.slug)) scoped.push(record);
    }
  }

  if (scoped.length === want.size) return scoped;

  const have = new Set(scoped.map((record) => record.slug));
  for (const slug of want) {
    if (have.has(slug)) continue;
    const loaded = await productsDataService.getProduct(localePrefix, slug);
    if (!loaded) continue;
    scoped.push(recordFromProduct(loaded.product, slug, collections));
  }
  return scoped;
}

async function buildListingCatalogLegacy(
  localePrefix: string,
): Promise<ProductListingRecord[]> {
  const taxonomy = await loadAllCollections(localePrefix);
  const slugs = await productsDataService.getProductSlugs(localePrefix);
  const records: ProductListingRecord[] = [];

  for (const slug of slugs) {
    const loaded = await productsDataService.getProduct(localePrefix, slug);
    if (!loaded) continue;
    records.push(recordFromProduct(loaded.product, slug, taxonomy));
  }

  return records;
}

export async function buildProductListingCatalog(
  localePrefix: string,
  filter?: Partial<ListingFilterState>,
  options?: CatalogBuildOptions,
): Promise<ProductListingCatalogPayload> {
  const collections = await loadAllCollections(localePrefix, options?.collections);
  const useIndex = useCatalogProductsDb() || (await hasProductListingIndex(localePrefix));

  if (useIndex) {
    if (filter) {
      const state: ListingFilterState = {
        q: "",
        categories: [],
        brands: [],
        collections: [],
        collectionScope: null,
        tags: [],
        conditions: [],
        variations: {},
        priceMin: null,
        priceMax: null,
        stockOnly: false,
        page: 1,
        per: 20,
        ...filter,
      };
      const result = await queryProductListing(localePrefix, state, {
        collections,
        orderingContext: { surface: "PRODUCT_LIST" },
      });
      if (result.total === 0 && countActiveFilters(state) === 0 && !useCatalogProductsDb()) {
        const fallbackRecords = await buildListingCatalogLegacy(localePrefix);
        if (fallbackRecords.length > 0) {
          const fallbackResult = await queryProductListing(localePrefix, state, {
            prefilteredRecords: fallbackRecords,
            collections,
            orderingContext: { surface: "PRODUCT_LIST" },
          });
          return {
            records: fallbackResult.records,
            facets: fallbackResult.facets,
            total: fallbackResult.total,
            page: fallbackResult.page,
            per: fallbackResult.per,
            totalPages: fallbackResult.totalPages,
          };
        }
      }
      return {
        records: result.records,
        facets: result.facets,
        total: result.total,
        page: result.page,
        per: result.per,
        totalPages: result.totalPages,
      };
    }

    let records = await loadListingRecords(localePrefix);
    if (records.length === 0 && !useCatalogProductsDb()) {
      records = await buildListingCatalogLegacy(localePrefix);
    }
    const orderingSettings = await loadProductOrderingSettings(localePrefix);
    const productListProfile = resolveProductOrderingProfile(orderingSettings, {
      surface: "PRODUCT_LIST",
    });
    if (productListProfile) {
      records = applyProductOrdering(records, productListProfile);
    }
    const cached = await loadFacetIndex(localePrefix, "global");
    const facets = cached
      ? applyCategoryVisibilityToFacets(cached, collections)
      : aggregateFacets(records, collections);
    return { records, facets, total: records.length };
  }

  let records = await buildListingCatalogLegacy(localePrefix);
  if (filter) {
    const state: ListingFilterState = {
      q: "",
      categories: [],
      brands: [],
      collections: [],
      collectionScope: null,
      tags: [],
      conditions: [],
      variations: {},
      priceMin: null,
      priceMax: null,
      stockOnly: false,
      page: 1,
      per: 20,
      ...filter,
    };
    const result = await queryProductListing(localePrefix, state, {
      prefilteredRecords: records,
      collections,
      orderingContext: { surface: "PRODUCT_LIST" },
    });
    return {
      records: result.records,
      facets: result.facets,
      total: result.total,
      page: result.page,
      per: result.per,
      totalPages: result.totalPages,
    };
  }

  {
    const orderingSettings = await loadProductOrderingSettings(localePrefix);
    const productListProfile = resolveProductOrderingProfile(orderingSettings, {
      surface: "PRODUCT_LIST",
    });
    if (productListProfile) {
      records = applyProductOrdering(records, productListProfile);
    }
  }

  return {
    records,
    facets: aggregateFacets(records, collections),
    total: records.length,
  };
}

/** Listing payload scoped to one collection's rule-matched products. */
export async function buildProductListingCatalogForCollection(
  localePrefix: string,
  collectionSlug: string,
  filter?: Partial<ListingFilterState>,
  options?: CatalogBuildOptions,
): Promise<ProductListingCatalogPayload> {
  const collections = await loadAllCollections(localePrefix, options?.collections);
  const collection = collections.find((c) => c.slug === collectionSlug && c.visible !== false);
  if (!collection) {
    return { records: [], facets: aggregateFacets([], collections), total: 0 };
  }

  let scopedRecords = await scopeRecordsToCollectionRules(localePrefix, collection, collections);

  const sortBy = collection.sortBy ?? "name-asc";
  const orderingSettings = await loadProductOrderingSettings(localePrefix);
  const orderingProfile =
    resolveProductOrderingProfile(orderingSettings, {
      surface: "CATEGORY",
      targetId: collectionSlug,
    }) ??
    resolveProductOrderingProfile(orderingSettings, {
      surface: "COLLECTION",
      targetId: collectionSlug,
    });

  if (orderingProfile) {
    scopedRecords = applyProductOrdering(scopedRecords, orderingProfile);
  } else {
    scopedRecords = sortListingRecords(scopedRecords, sortBy);
  }

  if (filter) {
    const state: ListingFilterState = {
      q: "",
      categories: [],
      brands: [],
      collections: [],
      tags: [],
      conditions: [],
      variations: {},
      priceMin: null,
      priceMax: null,
      stockOnly: false,
      page: 1,
      per: 20,
      ...filter,
      collectionScope: null,
    };
    const result = await queryProductListing(localePrefix, state, {
      prefilteredRecords: scopedRecords,
      listingMode: "product",
      collections,
      orderingContext: orderingProfile
        ? {
            surface: orderingProfile.scope.type === "COLLECTION" ? "COLLECTION" : "CATEGORY",
            targetId: collectionSlug,
          }
        : undefined,
      orderingSettings,
      collectionSort: orderingProfile ? undefined : sortBy,
    });
    return {
      records: result.records,
      facets: result.facets,
      total: result.total,
      page: result.page,
      per: result.per,
      totalPages: result.totalPages,
    };
  }

  const facets = applyCategoryVisibilityToFacets(
    aggregateFacets(scopedRecords, collections),
    collections,
  );

  return {
    records: scopedRecords,
    facets,
    total: scopedRecords.length,
  };
}

/** Collections index listing — one record per collection with product counts. */
export async function buildCollectionListingCatalog(
  localePrefix: string,
  filter?: Partial<ListingFilterState>,
  options?: CatalogBuildOptions,
): Promise<ProductListingCatalogPayload> {
  const taxonomy = await loadAllCollections(localePrefix, options?.collections);
  const collections = taxonomy.filter((c) => c.visible !== false);
  const indexCounts =
    options?.productCounts ??
    (await loadCollectionProductCounts(localePrefix, collections));
  const bySlug = collectionMapFromList(collections);
  const collectionNames: Record<string, string> = {};
  for (const col of collections) {
    collectionNames[col.slug] = col.name;
  }

  const records: ProductListingRecord[] = collections.map((col) => {
    const matchedCount = indexCounts.get(col.slug) ?? 0;
    const parentName = col.parentSlug ? collectionNames[col.parentSlug] : undefined;
    const media = resolveCollectionImages(col, bySlug);
    const searchText = buildListingSearchText([
      col.name,
      col.description ?? "",
      col.badge ?? "",
      parentName ?? "",
      ...(col.tags ?? []),
    ]);

    return {
      slug: col.slug,
      id: col.id,
      name: col.name,
      brand: col.badge,
      category: parentName,
      categories: parentName ? [parentName] : [],
      tags: col.tags ?? [],
      price: { value: matchedCount, currency: "USD" },
      old_price: undefined,
      priceMin: matchedCount,
      priceMax: matchedCount,
      short_description: col.description,
      availability: undefined,
      stock_status: undefined,
      mpn: undefined,
      rating: 0,
      reviews_count: matchedCount,
      primary_image: media.coverImage && isCollectionImageSrc(media.coverImage) ? media.coverImage : undefined,
      secondary_image: media.iconImage && isCollectionImageSrc(media.iconImage) ? media.iconImage : undefined,
      in_stock: true,
      conditions: [],
      variationFacets: {},
      parentSlug: col.parentSlug,
      collectionSlugs: [col.slug, ...(col.parentSlug ? [col.parentSlug] : [])],
      searchText,
    };
  });

  const publicRecords = filterPublicCollectionListingRecords(records);

  if (filter) {
    const state: ListingFilterState = {
      q: "",
      categories: [],
      brands: [],
      collections: [],
      collectionScope: null,
      tags: [],
      conditions: [],
      variations: {},
      priceMin: null,
      priceMax: null,
      stockOnly: false,
      page: 1,
      per: 20,
      ...filter,
    };
    const result = await queryProductListing(localePrefix, state, {
      prefilteredRecords: publicRecords,
      listingMode: "collection",
      collections: taxonomy,
    });
    return {
      records: result.records,
      facets: result.facets,
      total: result.total,
      page: result.page,
      per: result.per,
      totalPages: result.totalPages,
    };
  }

  return {
    records: publicRecords,
    facets: aggregateFacets(publicRecords, taxonomy),
    total: publicRecords.length,
  };
}
