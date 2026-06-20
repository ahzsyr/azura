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
  catalogEntityId,
  catalogProductSearchProvider,
  contentCollectionSearchProvider,
  contentTypeLandingSearchProvider,
} from "@/features/search-framework/providers/catalog-providers";
import type { SearchIndexer } from "@/features/search-framework/indexer/search-indexer";
import type { SearchIndexRecord } from "@/features/search-framework/types";
import {
  localeIndexDir,
  productsIndexRoot,
  buildCategoryIndexFromRecords,
} from "@/features/products/index/product-index-builder";
import type {
  CategoryIndexFile,
  FacetIndexFile,
  ProductListingIndexFile,
} from "@/features/products/index/product-index-types";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import { getProductCatalogIndex } from "@/features/products/fs/product-catalog-index";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";

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
  await indexer.upsertRecords(records, { revalidate: false });
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
    const catalogLocale = await catalogLocaleForUrlPrefix(urlPrefix);

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

  await reconcileCatalogSearchIndexes(indexer, resolved);
}

type CatalogDocKey = `${string}:${string}:${string}`;

function catalogDocKey(entityType: string, entityId: string, locale: string): CatalogDocKey {
  return `${entityType}:${entityId}:${locale}`;
}

async function buildValidCatalogDocKeys(
  resolved: CatalogSearchDiscovery,
): Promise<Set<CatalogDocKey>> {
  const valid = new Set<CatalogDocKey>();

  for (const { urlPrefix } of resolved.indexerLocales) {
    const catalogLocale = await catalogLocaleForUrlPrefix(urlPrefix);

    if (resolved.siteCatalog.products) {
      const records = await loadListingRecords(urlPrefix);
      for (const record of records) {
        valid.add(
          catalogDocKey(
            "CATALOG_PRODUCT",
            catalogEntityId("product", record.slug),
            urlPrefix,
          ),
        );
      }
    }

    if (resolved.siteCatalog.collections) {
      const cols = await collectionsDataService.loadAll({ localePrefix: urlPrefix });
      for (const col of cols) {
        if (!catalogCollectionSearchProvider.shouldIndex(col)) continue;
        valid.add(
          catalogDocKey("CATALOG_COLLECTION", catalogEntityId("pcol", col.slug), urlPrefix),
        );
      }
    }

    if (resolved.siteCatalog.categories) {
      const records = await loadListingRecords(urlPrefix);
      const categories = useCatalogProductsDb()
        ? buildCategoryIndexFromRecords(records)
        : ((await readJson<CategoryIndexFile>(
            join(localeIndexDir(catalogLocale), "category-index.json"),
          ))?.categories ?? {});

      const seen = new Set<string>();
      for (const slug of Object.keys(categories)) {
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        valid.add(
          catalogDocKey("CATALOG_CATEGORY", catalogEntityId("pcat", slug), urlPrefix),
        );
      }

      if (useCatalogProductsDb()) {
        for (const record of records) {
          for (const cat of record.categories ?? []) {
            if (!cat || seen.has(cat)) continue;
            seen.add(cat);
            valid.add(
              catalogDocKey("CATALOG_CATEGORY", catalogEntityId("pcat", cat), urlPrefix),
            );
          }
        }
      } else {
        const listing = await readJson<ProductListingIndexFile>(
          join(localeIndexDir(catalogLocale), "product-listing-index.json"),
        );
        if (listing?.records) {
          for (const record of listing.records) {
            for (const cat of record.categories ?? []) {
              if (!cat || seen.has(cat)) continue;
              seen.add(cat);
              valid.add(
                catalogDocKey("CATALOG_CATEGORY", catalogEntityId("pcat", cat), urlPrefix),
              );
            }
          }
        }
      }
    }
  }

  return valid;
}

/** Remove stale catalog rows from SearchDocument that no longer exist in JSON indexes. */
export async function reconcileCatalogSearchIndexes(
  indexer: SearchIndexer,
  discovery?: CatalogSearchDiscovery,
): Promise<{ removed: number }> {
  const resolved = discovery ?? (await discoverCatalogSearchSources());
  const valid = await buildValidCatalogDocKeys(resolved);
  const { prisma } = await import("@/lib/prisma");

  const catalogTypes: Array<"CATALOG_PRODUCT" | "CATALOG_COLLECTION" | "CATALOG_CATEGORY"> = [];
  if (resolved.siteCatalog.products) catalogTypes.push("CATALOG_PRODUCT");
  if (resolved.siteCatalog.collections) catalogTypes.push("CATALOG_COLLECTION");
  if (resolved.siteCatalog.categories) catalogTypes.push("CATALOG_CATEGORY");

  if (catalogTypes.length === 0) return { removed: 0 };

  const localePrefixes = resolved.indexerLocales.map((l) => l.urlPrefix);
  const existing = await prisma.searchDocument.findMany({
    where: {
      entityType: { in: catalogTypes },
      locale: { in: localePrefixes },
    },
    select: { id: true, entityType: true, entityId: true, locale: true },
  });

  const staleIds: string[] = [];
  for (const row of existing) {
    const key = catalogDocKey(row.entityType, row.entityId, row.locale);
    if (!valid.has(key)) staleIds.push(row.id);
  }

  if (staleIds.length === 0) return { removed: 0 };

  const batchSize = 500;
  for (let i = 0; i < staleIds.length; i += batchSize) {
    const batch = staleIds.slice(i, i + batchSize);
    await prisma.searchDocument.deleteMany({ where: { id: { in: batch } } });
  }

  void indexer;
  return { removed: staleIds.length };
}

export async function upsertCatalogProductRecord(
  indexer: SearchIndexer,
  urlPrefix: string,
  catalogLocale: string,
  record: Awaited<ReturnType<typeof loadListingRecords>>[number],
): Promise<void> {
  const ctx = { urlPrefix, code: catalogLocale };
  const catalogIndex = await getProductCatalogIndex(urlPrefix);
  const entry = catalogIndex.get(record.slug);
  const source = {
    ...record,
    productId: entry?.ruleMeta.id,
  };
  const built = catalogProductSearchProvider.buildRecords(source, ctx);
  await upsertRecords(indexer, built);
}

export async function removeCatalogProduct(
  indexer: SearchIndexer,
  urlPrefix: string,
  slug: string,
): Promise<void> {
  const entityId = catalogEntityId("product", slug);
  const { prisma } = await import("@/lib/prisma");
  await prisma.searchDocument.deleteMany({
    where: {
      entityType: "CATALOG_PRODUCT",
      entityId,
      locale: urlPrefix,
    },
  });
  void indexer;
}

export async function removeCatalogCollection(
  indexer: SearchIndexer,
  urlPrefix: string,
  slug: string,
): Promise<void> {
  const entityId = catalogEntityId("pcol", slug);
  const { prisma } = await import("@/lib/prisma");
  await prisma.searchDocument.deleteMany({
    where: {
      entityType: "CATALOG_COLLECTION",
      entityId,
      locale: urlPrefix,
    },
  });
  void indexer;
}

async function syncCatalogProducts(
  indexer: SearchIndexer,
  urlPrefix: string,
  catalogLocale: string,
  ctx: { urlPrefix: string; code: string }
) {
  const records = await loadListingRecords(urlPrefix);

  if (records.length > 0) {
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
  const records = await loadListingRecords(urlPrefix);
  const collections = orderCollectionsHierarchy(
    (await collectionsDataService.loadAll({ localePrefix: urlPrefix })).filter(
      (c) => c.visible !== false,
    ),
  );
  const facets = aggregateFacets(records, collections);
  const labelBySlug = new Map<string, string>();
  for (const cat of facets.categories) {
    labelBySlug.set(cat.value, cat.label);
  }

  const categories = useCatalogProductsDb()
    ? buildCategoryIndexFromRecords(records)
    : (await readJson<CategoryIndexFile>(
        join(localeIndexDir(catalogLocale), "category-index.json"),
      ))?.categories ?? {};

  if (!useCatalogProductsDb()) {
    const facetFile = await readJson<FacetIndexFile>(
      join(localeIndexDir(catalogLocale), "facet-index.json"),
    );
    for (const cat of facetFile?.global?.categories ?? []) {
      labelBySlug.set(cat.value, cat.label);
    }
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

  if (!useCatalogProductsDb()) {
    const listingPath = join(localeIndexDir(catalogLocale), "product-listing-index.json");
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
  } else {
    for (const record of records) {
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
