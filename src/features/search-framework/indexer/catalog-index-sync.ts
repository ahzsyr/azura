import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  discoverCatalogSearchSources,
  catalogLocaleForUrlPrefix,
  type CatalogSearchDiscovery,
} from "@/features/search-framework/discovery/catalog-search-discovery";
import {
  catalogCategorySearchProvider,
  catalogCollectionSearchProvider,
  catalogProductSearchProvider,
  contentCollectionSearchProvider,
  contentTypeLandingSearchProvider,
} from "@/features/search-framework/providers/catalog-providers";
import type { SearchIndexer } from "@/features/search-framework/indexer/search-indexer";
import type { SearchIndexRecord } from "@/features/search-framework/types";
import { runWithConcurrency } from "@/features/search-framework/performance/index-concurrency";
import { getSearchPerformanceConfig } from "@/features/search-framework/performance/search-performance-config";
import {
  localeIndexDir,
  productsIndexRoot,
} from "@/features/products/index/product-index-builder";
import type {
  CategoryIndexFile,
  FacetIndexFile,
  ProductListingIndexFile,
} from "@/features/products/index/product-index-types";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import { getProductCatalogIndex } from "@/features/products/fs/product-catalog-index";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function upsertRecords(
  indexer: SearchIndexer,
  records: SearchIndexRecord[]
): Promise<void> {
  const perf = getSearchPerformanceConfig();
  await runWithConcurrency(
    records,
    async (record) => {
      await indexer.upsertRecord(record, { revalidate: false });
    },
    perf.indexConcurrency
  );
}

export async function syncCatalogSearchIndexes(
  indexer: SearchIndexer,
  discovery?: CatalogSearchDiscovery
): Promise<void> {
  const resolved = discovery ?? (await discoverCatalogSearchSources());
  for (const { urlPrefix, code } of resolved.indexerLocales) {
    const ctx = { urlPrefix, code };

    if (resolved.sources.contentTypeLandings) {
      const landingRecords: SearchIndexRecord[] = [];
      for (const type of resolved.contentTypes) {
        if (!resolved.enabledContentTypeIds.has(type.id)) continue;
        if (!contentTypeLandingSearchProvider.shouldIndex(type)) continue;
        landingRecords.push(...contentTypeLandingSearchProvider.buildRecords(type, ctx));
      }
      await upsertRecords(indexer, landingRecords);
    }

    const collectionRecords: SearchIndexRecord[] = [];
    for (const col of resolved.contentCollections) {
      const type = resolved.contentTypes.find((t) => t.id === col.contentTypeId);
      const source = {
        ...col,
        routePrefix: type?.routePrefix ?? col.contentTypeSlug,
      };
      if (!contentCollectionSearchProvider.shouldIndex(source)) continue;
      collectionRecords.push(...contentCollectionSearchProvider.buildRecords(source, ctx));
    }
    await upsertRecords(indexer, collectionRecords);
  }

  if (
    !resolved.siteCatalog.products &&
    !resolved.siteCatalog.collections &&
    !resolved.siteCatalog.categories
  ) {
    return;
  }

  for (const { urlPrefix, code } of resolved.indexerLocales) {
    const ctx = { urlPrefix, code };
    const catalogLocale = catalogLocaleForUrlPrefix(urlPrefix);

    if (resolved.siteCatalog.products) {
      await syncCatalogProducts(indexer, urlPrefix, catalogLocale, ctx);
    }
    if (resolved.siteCatalog.collections) {
      await syncCatalogCollections(indexer, urlPrefix, ctx);
    }
    if (resolved.siteCatalog.categories) {
      await syncCatalogCategories(indexer, catalogLocale, urlPrefix, ctx);
    }
  }
}

async function syncCatalogProducts(
  indexer: SearchIndexer,
  urlPrefix: string,
  catalogLocale: string,
  ctx: { urlPrefix: string; code: string }
) {
  const records = await loadListingRecords(urlPrefix);
  if (!records?.length) return;

  const catalogIndex = await getProductCatalogIndex(urlPrefix);
  const slugToId = new Map<string, string>();
  for (const [slug, entry] of catalogIndex) {
    if (entry.ruleMeta.id) slugToId.set(slug, entry.ruleMeta.id);
  }

  const allRecords: SearchIndexRecord[] = [];
  for (const record of records) {
    const source = {
      ...record,
      productId: slugToId.get(record.slug),
    };
    allRecords.push(...catalogProductSearchProvider.buildRecords(source, ctx));
  }
  await upsertRecords(indexer, allRecords);
}

async function syncCatalogCollections(
  indexer: SearchIndexer,
  urlPrefix: string,
  ctx: { urlPrefix: string; code: string }
) {
  const cols = await collectionsDataService.loadAll({ localePrefix: urlPrefix });
  const allRecords: SearchIndexRecord[] = [];
  for (const col of cols) {
    if (!catalogCollectionSearchProvider.shouldIndex(col)) continue;
    allRecords.push(...catalogCollectionSearchProvider.buildRecords(col, ctx));
  }
  await upsertRecords(indexer, allRecords);
}

async function syncCatalogCategories(
  indexer: SearchIndexer,
  catalogLocale: string,
  urlPrefix: string,
  ctx: { urlPrefix: string; code: string }
) {
  const dir = localeIndexDir(catalogLocale as "en-us" | "ar-ae");
  const categoryFile = await readJson<CategoryIndexFile>(join(dir, "category-index.json"));
  const facetFile = await readJson<FacetIndexFile>(join(dir, "facet-index.json"));
  const categories = categoryFile?.categories ?? {};

  const labelBySlug = new Map<string, string>();
  for (const cat of facetFile?.global?.categories ?? []) {
    labelBySlug.set(cat.value, cat.label);
  }

  const seen = new Set<string>();
  const allRecords: SearchIndexRecord[] = [];

  for (const [slug, productSlugs] of Object.entries(categories)) {
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const source = {
      slug,
      label: labelBySlug.get(slug) ?? slug.replace(/-/g, " "),
      productCount: productSlugs.length,
    };
    allRecords.push(...catalogCategorySearchProvider.buildRecords(source, ctx));
  }

  const listingPath = join(dir, "product-listing-index.json");
  const listing = await readJson<ProductListingIndexFile>(listingPath);
  if (listing?.records) {
    for (const record of listing.records) {
      for (const cat of record.categories ?? []) {
        if (!cat || seen.has(cat)) continue;
        seen.add(cat);
        const source = {
          slug: cat,
          label: labelBySlug.get(cat) ?? cat.replace(/-/g, " "),
          productCount: 0,
        };
        allRecords.push(...catalogCategorySearchProvider.buildRecords(source, ctx));
      }
    }
  }

  await upsertRecords(indexer, allRecords);
}

export async function removeCatalogProductIndexes(
  indexer: SearchIndexer,
  localePrefixes: string[]
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  for (const locale of localePrefixes) {
    await prisma.searchDocument.deleteMany({
      where: { entityType: "CATALOG_PRODUCT", locale },
    });
  }
}

export function productIndexManifestPath(): string {
  return join(productsIndexRoot(), "manifest.json");
}
