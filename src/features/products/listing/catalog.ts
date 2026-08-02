import "server-only";

import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { Collection } from "@/features/collections/types";
import { ruleMetaToCollectionProduct, matchProductToCollection } from "@/features/collections/engine";
import { getUniqueProductIndexEntries } from "@/features/products/fs/product-catalog-index";
import { loadCollectionProductCounts } from "@/features/collections/collection-product-counts";
import { filterPublicCollectionListingRecords } from "@/features/collections/collection-public-visibility";
import { collectionMapFromList, resolveCollectionImages } from "@/features/collections/collection-navigation";
import { productsDataService } from "@/features/products/products-data.service";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { loadListingRecordsFromDb } from "@/features/products/db/product-listing-loader";
import {
  hasProductListingIndex,
  loadCollectionSlugIndex,
  loadFacetIndex,
  loadListingRecords,
  loadListingRecordsForSlugs,
} from "@/features/products/index/product-index-loader";
import { buildListingSearchText, recordFromProduct } from "@/features/products/listing/record-from-product";
import { queryProductListing, sortListingRecords } from "@/features/products/listing/query-listing";
import { countActiveFilters } from "@/features/products/listing/url-state";
import { aggregateFacets } from "./aggregate-facets";
import type {
  ListingFilterState,
  ProductListingCatalogPayload,
  ProductListingRecord,
} from "./types";

async function loadCollections(localePrefix: string, preloaded?: Collection[]): Promise<Collection[]> {
  if (preloaded) return preloaded;
  const allCols = await collectionsDataService.loadAll({ localePrefix });
  return orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
}

type CatalogBuildOptions = {
  collections?: Collection[];
  productCounts?: Map<string, number>;
};

async function scopeRecordsToCollectionLive(
  localePrefix: string,
  collection: Collection,
  collections: Collection[],
): Promise<ProductListingRecord[]> {
  if (useCatalogProductsDb()) {
    const records = await loadListingRecordsFromDb(localePrefix);
    return records.filter((r) => r.collectionSlugs?.includes(collection.slug));
  }

  const indexEntries = await getUniqueProductIndexEntries(localePrefix);
  const matchedSlugs: string[] = [];
  for (const entry of indexEntries) {
    const engine = ruleMetaToCollectionProduct(entry.ruleMeta);
    if (matchProductToCollection(engine, collection)) {
      matchedSlugs.push(entry.slug);
    }
  }
  const scopedRecords: ProductListingRecord[] = [];
  for (const slug of matchedSlugs) {
    const loaded = await productsDataService.getProduct(localePrefix, slug);
    if (!loaded) continue;
    scopedRecords.push(recordFromProduct(loaded.product, slug, collections));
  }
  return scopedRecords;
}

async function buildListingCatalogLegacy(
  localePrefix: string,
): Promise<ProductListingRecord[]> {
  const collections = await loadCollections(localePrefix);
  const slugs = await productsDataService.getProductSlugs(localePrefix);
  const records: ProductListingRecord[] = [];

  for (const slug of slugs) {
    const loaded = await productsDataService.getProduct(localePrefix, slug);
    if (!loaded) continue;
    records.push(recordFromProduct(loaded.product, slug, collections));
  }

  return records;
}

export async function buildProductListingCatalog(
  localePrefix: string,
  filter?: Partial<ListingFilterState>,
  options?: CatalogBuildOptions,
): Promise<ProductListingCatalogPayload> {
  const collections = await loadCollections(localePrefix, options?.collections);
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
      const result = await queryProductListing(localePrefix, state, { collections });
      if (result.total === 0 && countActiveFilters(state) === 0 && !useCatalogProductsDb()) {
        const fallbackRecords = await buildListingCatalogLegacy(localePrefix);
        if (fallbackRecords.length > 0) {
          const fallbackResult = await queryProductListing(localePrefix, state, {
            prefilteredRecords: fallbackRecords,
            collections,
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
    const facets =
      (await loadFacetIndex(localePrefix, "global")) ??
      aggregateFacets(records, collections);
    return { records, facets, total: records.length };
  }

  const records = await buildListingCatalogLegacy(localePrefix);
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
  const collections = await loadCollections(localePrefix, options?.collections);
  const collection = collections.find((c) => c.slug === collectionSlug);
  if (!collection) {
    return { records: [], facets: aggregateFacets([], collections), total: 0 };
  }

  const useIndex = useCatalogProductsDb() || (await hasProductListingIndex(localePrefix));
  let scopedRecords: ProductListingRecord[];

  if (useIndex) {
    const slugSet = await loadCollectionSlugIndex(localePrefix, collectionSlug);
    if (slugSet && slugSet.size > 0) {
      scopedRecords = await loadListingRecordsForSlugs(localePrefix, slugSet);
    } else {
      const allRecords = await loadListingRecords(localePrefix);
      if (allRecords.some((r) => r.collectionSlugs.includes(collectionSlug))) {
        scopedRecords = allRecords.filter((r) => r.collectionSlugs.includes(collectionSlug));
      } else {
        scopedRecords = await scopeRecordsToCollectionLive(localePrefix, collection, collections);
      }
    }
  } else {
    scopedRecords = await scopeRecordsToCollectionLive(localePrefix, collection, collections);
  }

  const sortBy = collection.sortBy ?? "name-asc";
  scopedRecords = sortListingRecords(scopedRecords, sortBy);

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

  const facets =
    (await loadFacetIndex(localePrefix, collectionSlug)) ??
    aggregateFacets(scopedRecords, collections);

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
  const collections = await loadCollections(localePrefix, options?.collections);
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
      primary_image: media.coverImage,
      secondary_image: media.iconImage,
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
      collections,
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
    facets: aggregateFacets(publicRecords, collections),
    total: publicRecords.length,
  };
}
