import "server-only";

import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { Collection } from "@/features/collections/types";
import { ruleMetaToCollectionProduct, matchProductToCollection } from "@/features/collections/engine";
import { getUniqueProductIndexEntries } from "@/features/products/fs/product-catalog-index";
import { getCollectionProducts, loadProductsForCollectionRules } from "@/features/collections/collection-products";
import { collectionMapFromList, resolveCollectionImages } from "@/features/collections/collection-navigation";
import { productsDataService } from "@/features/products/products-data.service";
import {
  hasProductListingIndex,
  loadCollectionSlugIndex,
  loadFacetIndex,
  loadListingRecords,
} from "@/features/products/index/product-index-loader";
import { buildListingSearchText, recordFromProduct } from "@/features/products/listing/record-from-product";
import { queryProductListing, sortListingRecords } from "@/features/products/listing/query-listing";
import { aggregateFacets } from "./aggregate-facets";
import type {
  ListingFilterState,
  ProductListingCatalogPayload,
  ProductListingRecord,
} from "./types";

async function loadCollections(localePrefix: string): Promise<Collection[]> {
  const allCols = await collectionsDataService.loadAll({ localePrefix });
  return orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
}

async function scopeRecordsToCollectionLive(
  localePrefix: string,
  collection: Collection,
  collections: Collection[],
): Promise<ProductListingRecord[]> {
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
): Promise<ProductListingCatalogPayload> {
  const collections = await loadCollections(localePrefix);
  const useIndex = await hasProductListingIndex(localePrefix);

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
      const result = await queryProductListing(localePrefix, state);
      return {
        records: result.records,
        facets: result.facets,
        total: result.total,
        page: result.page,
        per: result.per,
        totalPages: result.totalPages,
      };
    }

    const records = await loadListingRecords(localePrefix);
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
): Promise<ProductListingCatalogPayload> {
  const collections = await loadCollections(localePrefix);
  const collection = collections.find((c) => c.slug === collectionSlug);
  if (!collection) {
    return { records: [], facets: aggregateFacets([], collections), total: 0 };
  }

  const useIndex = await hasProductListingIndex(localePrefix);
  let scopedRecords: ProductListingRecord[];

  if (useIndex) {
    const slugSet = await loadCollectionSlugIndex(localePrefix, collectionSlug);
    const allRecords = await loadListingRecords(localePrefix);
    if (slugSet && slugSet.size > 0) {
      scopedRecords = allRecords.filter((r) => slugSet.has(r.slug));
    } else if (allRecords.some((r) => r.collectionSlugs.includes(collectionSlug))) {
      scopedRecords = allRecords.filter((r) => r.collectionSlugs.includes(collectionSlug));
    } else {
      scopedRecords = await scopeRecordsToCollectionLive(localePrefix, collection, collections);
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
): Promise<ProductListingCatalogPayload> {
  const collections = await loadCollections(localePrefix);
  const useIndex = await hasProductListingIndex(localePrefix);

  let indexCounts: Map<string, number> | null = null;
  if (useIndex) {
    const counts = new Map<string, number>();
    for (const col of collections) {
      const slugSet = await loadCollectionSlugIndex(localePrefix, col.slug);
      counts.set(col.slug, slugSet?.size ?? 0);
    }
    indexCounts = counts;
  }

  const products = indexCounts ? [] : await loadProductsForCollectionRules(localePrefix);
  const bySlug = collectionMapFromList(collections);
  const collectionNames: Record<string, string> = {};
  for (const col of collections) {
    collectionNames[col.slug] = col.name;
  }

  const records: ProductListingRecord[] = collections.map((col) => {
    const matchedCount = indexCounts
      ? (indexCounts.get(col.slug) ?? 0)
      : getCollectionProducts(col, products).length;
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
      listingMode: "collection",
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
