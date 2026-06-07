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
import {
  localeIndexDir,
  productsIndexRoot,
} from "@/features/products/index/product-index-builder";
import type {
  CategoryIndexFile,
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

export async function syncCatalogSearchIndexes(
  indexer: SearchIndexer,
  discovery?: CatalogSearchDiscovery
): Promise<void> {
  const resolved = discovery ?? (await discoverCatalogSearchSources());
  for (const { urlPrefix, code } of resolved.indexerLocales) {
    const ctx = { urlPrefix, code };

    for (const type of resolved.contentTypes) {
      if (!resolved.sources.contentTypeLandings) continue;
      if (!resolved.enabledContentTypeIds.has(type.id)) continue;
      if (!contentTypeLandingSearchProvider.shouldIndex(type)) continue;
      for (const record of contentTypeLandingSearchProvider.buildRecords(type, ctx)) {
        await indexer.upsertRecord(record, { revalidate: false });
      }
    }

    for (const col of resolved.contentCollections) {
      const type = resolved.contentTypes.find((t) => t.id === col.contentTypeId);
      const source = {
        ...col,
        routePrefix: type?.routePrefix ?? col.contentTypeSlug,
      };
      if (!contentCollectionSearchProvider.shouldIndex(source)) continue;
      for (const record of contentCollectionSearchProvider.buildRecords(source, ctx)) {
        await indexer.upsertRecord(record, { revalidate: false });
      }
    }
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

  for (const record of records) {
    const source = {
      ...record,
      productId: slugToId.get(record.slug),
    };
    for (const doc of catalogProductSearchProvider.buildRecords(source, ctx)) {
      await indexer.upsertRecord(doc, { revalidate: false });
    }
  }
}

async function syncCatalogCollections(
  indexer: SearchIndexer,
  urlPrefix: string,
  ctx: { urlPrefix: string; code: string }
) {
  const cols = await collectionsDataService.loadAll({ localePrefix: urlPrefix });
  for (const col of cols) {
    if (!catalogCollectionSearchProvider.shouldIndex(col)) continue;
    for (const doc of catalogCollectionSearchProvider.buildRecords(col, ctx)) {
      await indexer.upsertRecord(doc, { revalidate: false });
    }
  }
}

async function syncCatalogCategories(
  indexer: SearchIndexer,
  catalogLocale: string,
  urlPrefix: string,
  ctx: { urlPrefix: string; code: string }
) {
  const path = join(localeIndexDir(catalogLocale as "en-us" | "ar-ae"), "category-index.json");
  const categoryFile = await readJson<CategoryIndexFile>(path);
  const categories = categoryFile?.categories ?? {};

  const seen = new Set<string>();
  for (const [slug, productSlugs] of Object.entries(categories)) {
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const source = {
      slug,
      label: slug.replace(/-/g, " "),
      productCount: productSlugs.length,
    };
    for (const doc of catalogCategorySearchProvider.buildRecords(source, ctx)) {
      await indexer.upsertRecord(doc, { revalidate: false });
    }
  }

  const listingPath = join(localeIndexDir(catalogLocale as "en-us" | "ar-ae"), "product-listing-index.json");
  const listing = await readJson<ProductListingIndexFile>(listingPath);
  if (listing?.records) {
    for (const record of listing.records) {
      for (const cat of record.categories ?? []) {
        if (!cat || seen.has(cat)) continue;
        seen.add(cat);
        const source = { slug: cat, label: cat, productCount: 0 };
        for (const doc of catalogCategorySearchProvider.buildRecords(source, ctx)) {
          await indexer.upsertRecord(doc, { revalidate: false });
        }
      }
    }
  }
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
