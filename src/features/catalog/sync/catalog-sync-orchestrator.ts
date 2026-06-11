import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { catalogLocaleFromParam } from "@/features/products/fs/product-fs-scan";
import type { CatalogLocale } from "@/features/catalog/locales";
import { CATALOG_LOCALES } from "@/features/catalog/locales";
import {
  patchLocaleProductIndex,
  productsIndexRoot,
  writeLocaleProductIndexes,
} from "@/features/products/index/product-index-builder";
import type { ProductIndexManifest } from "@/features/products/index/product-index-types";
import { invalidateProductCatalogIndex } from "@/features/products/fs/product-catalog-index";
import { invalidateProductIndexLoaderCache } from "@/features/products/index/product-index-loader";
import type { Product } from "@/features/products/types";
import {
  syncSingleProduct,
  type ProductSyncResult,
} from "@/features/collections/collection-sync.service";
import { frameworkSearchIndexer } from "@/features/search-framework";
import {
  removeCatalogProduct,
  reconcileCatalogSearchIndexes,
  upsertCatalogProductRecord,
} from "@/features/search-framework/indexer/catalog-index-sync";
import { getSearchPerformanceConfig } from "@/features/search-framework/performance/search-performance-config";
import { clearSearchQueryCache } from "@/features/search-framework/performance/search-query-cache";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import { revalidateProductListing, revalidateProductSlug, revalidateSearch } from "@/services/cache";
import {
  logCatalogSync,
  saveCatalogSyncStatus,
  type CatalogSyncStatus,
} from "@/features/catalog/sync/catalog-sync-logger";
import {
  createCatalogSyncJob,
  shouldDeferCatalogSync,
  updateCatalogSyncJob,
} from "@/features/catalog/sync/catalog-sync-jobs";

export type CatalogSyncResult = {
  ok: boolean;
  collectionSync: ProductSyncResult | null;
  indexSync: { count: number; mode: "patch" | "full" } | null;
  searchSync: { upserted?: boolean; removed?: number } | null;
  errors: string[];
  warnings: string[];
  jobId?: string;
};

async function writeJsonAtomic(dir: string, filename: string, data: unknown): Promise<void> {
  const { mkdir, rename } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });
  const target = join(dir, filename);
  const temp = `${target}.tmp`;
  await writeFile(temp, JSON.stringify(data), "utf-8");
  await rename(temp, target);
}

async function updateManifest(locale: CatalogLocale, count: number, signature: string): Promise<void> {
  const manifestPath = join(productsIndexRoot(), "manifest.json");
  let manifest: ProductIndexManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    locales: [locale],
    counts: { [locale]: count },
    signatures: { [locale]: signature },
  };

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as ProductIndexManifest;
  } catch {
    /* fresh */
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.counts[locale] = count;
  manifest.signatures[locale] = signature;
  if (!manifest.locales.includes(locale)) manifest.locales.push(locale);
  await writeJsonAtomic(productsIndexRoot(), "manifest.json", manifest);
}

function localePrefixFromCatalogLocale(locale: CatalogLocale): string {
  return locale === "ar-ae" ? "ar" : "en";
}

function invalidateCatalogCaches(localePrefix: string, slug?: string): void {
  invalidateProductCatalogIndex();
  invalidateProductIndexLoaderCache();
  revalidateProductListing(localePrefix);
  if (slug) revalidateProductSlug(localePrefix, slug);
}

async function syncSearchAfterProductSave(
  localePrefix: string,
  catalogLocale: CatalogLocale,
  slug: string,
): Promise<{ upserted: boolean }> {
  const perf = getSearchPerformanceConfig();
  if (!perf.syncCatalogOnProductIndex) return { upserted: false };

  const records = await loadListingRecords(localePrefix);
  const record = records.find((r) => r.slug === slug);
  if (!record) return { upserted: false };

  await upsertCatalogProductRecord(
    frameworkSearchIndexer,
    localePrefix,
    catalogLocale,
    record,
  );
  const { removed } = await reconcileCatalogSearchIndexes(frameworkSearchIndexer);
  revalidateSearch();
  clearSearchQueryCache();
  return { upserted: true };
}

async function syncSearchAfterProductDelete(
  localePrefix: string,
  slug: string,
  oldSlugs: string[] = [],
): Promise<{ removed: number }> {
  const perf = getSearchPerformanceConfig();
  if (!perf.syncCatalogOnProductIndex) return { removed: 0 };

  for (const s of oldSlugs.length ? oldSlugs : [slug]) {
    await removeCatalogProduct(frameworkSearchIndexer, localePrefix, s);
  }
  const { removed } = await reconcileCatalogSearchIndexes(frameworkSearchIndexer);
  revalidateSearch();
  clearSearchQueryCache();
  return { removed };
}

async function persistStatus(status: CatalogSyncStatus): Promise<void> {
  await saveCatalogSyncStatus(status);
}

export const catalogSyncOrchestrator = {
  async onProductSaved(
    localePrefix: string,
    slug: string,
    product: Product,
    opts?: { relPath?: string; mtimeMs?: number; oldSlug?: string },
  ): Promise<CatalogSyncResult> {
    const started = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const catalogLocale = catalogLocaleFromParam(localePrefix);
    const prefix = localePrefixFromCatalogLocale(catalogLocale);

    let collectionSync: ProductSyncResult | null = null;
    try {
      collectionSync = await syncSingleProduct(slug, product);
      if (collectionSync.isOrphan) {
        warnings.push(`Product "${slug}" does not match any collection`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`collection sync: ${msg}`);
      await logCatalogSync({
        level: "warn",
        operation: "onProductSaved.collection",
        locale: localePrefix,
        slug,
        message: msg,
      });
    }

    let indexSync: CatalogSyncResult["indexSync"] = null;
    try {
      if (opts?.oldSlug && opts.oldSlug !== slug) {
        await patchLocaleProductIndex(catalogLocale, prefix, "delete", opts.oldSlug, undefined, {
          gzip: true,
        });
      }
      const patch = await patchLocaleProductIndex(catalogLocale, prefix, "save", slug, product, {
        relPath: opts?.relPath,
        mtimeMs: opts?.mtimeMs,
        gzip: true,
      });
      await updateManifest(catalogLocale, patch.count, patch.signature);
      indexSync = { count: patch.count, mode: patch.mode };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`index patch: ${msg}`);
      await logCatalogSync({
        level: "error",
        operation: "onProductSaved.index",
        locale: localePrefix,
        slug,
        message: msg,
        error: msg,
      });
    }

    let searchSync: CatalogSyncResult["searchSync"] = null;
    try {
      if (opts?.oldSlug && opts.oldSlug !== slug) {
        await removeCatalogProduct(frameworkSearchIndexer, localePrefix, opts.oldSlug);
      }
      const upsert = await syncSearchAfterProductSave(localePrefix, catalogLocale, slug);
      searchSync = upsert;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`search sync: ${msg}`);
      await logCatalogSync({
        level: "error",
        operation: "onProductSaved.search",
        locale: localePrefix,
        slug,
        message: msg,
        error: msg,
      });
    }

    invalidateCatalogCaches(localePrefix, slug);
    if (opts?.oldSlug && opts.oldSlug !== slug) {
      revalidateProductSlug(localePrefix, opts.oldSlug);
    }

    const ok = errors.length === 0;
    await persistStatus({
      lastRunAt: new Date().toISOString(),
      lastOperation: "onProductSaved",
      locale: localePrefix,
      ok,
      indexCount: indexSync?.count,
      errors,
      warnings,
    });
    await logCatalogSync({
      level: ok ? "info" : "warn",
      operation: "onProductSaved",
      locale: localePrefix,
      slug,
      durationMs: Date.now() - started,
      message: ok ? "completed" : errors.join("; "),
    });

    return { ok, collectionSync, indexSync, searchSync, errors, warnings };
  },

  async onProductDeleted(
    localePrefix: string,
    slug: string,
    opts?: { oldSlug?: string },
  ): Promise<CatalogSyncResult> {
    const started = Date.now();
    const errors: string[] = [];
    const catalogLocale = catalogLocaleFromParam(localePrefix);
    const prefix = localePrefixFromCatalogLocale(catalogLocale);
    const slugsToRemove = [slug, opts?.oldSlug].filter(Boolean) as string[];

    let indexSync: CatalogSyncResult["indexSync"] = null;
    try {
      const patch = await patchLocaleProductIndex(catalogLocale, prefix, "delete", slug);
      await updateManifest(catalogLocale, patch.count, patch.signature);
      indexSync = { count: patch.count, mode: patch.mode };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`index patch: ${msg}`);
    }

    let searchSync: CatalogSyncResult["searchSync"] = null;
    try {
      searchSync = await syncSearchAfterProductDelete(localePrefix, slug, slugsToRemove);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`search sync: ${msg}`);
    }

    invalidateCatalogCaches(localePrefix, slug);
    for (const s of slugsToRemove) {
      if (s !== slug) revalidateProductSlug(localePrefix, s);
    }

    const ok = errors.length === 0;
    await persistStatus({
      lastRunAt: new Date().toISOString(),
      lastOperation: "onProductDeleted",
      locale: localePrefix,
      ok,
      indexCount: indexSync?.count,
      searchRemoved: searchSync?.removed,
      errors,
      warnings: [],
    });
    await logCatalogSync({
      level: ok ? "info" : "warn",
      operation: "onProductDeleted",
      locale: localePrefix,
      slug,
      durationMs: Date.now() - started,
      message: ok ? "completed" : errors.join("; "),
    });

    return { ok, collectionSync: null, indexSync, searchSync, errors, warnings: [] };
  },

  async onProductRenamed(
    localePrefix: string,
    oldSlug: string,
    newSlug: string,
    product: Product,
    opts?: { relPath?: string; mtimeMs?: number },
  ): Promise<CatalogSyncResult> {
    const deleteResult = await this.onProductDeleted(localePrefix, oldSlug, { oldSlug });
    const saveResult = await this.onProductSaved(localePrefix, newSlug, product, {
      ...opts,
      oldSlug,
    });
    return {
      ok: deleteResult.ok && saveResult.ok,
      collectionSync: saveResult.collectionSync,
      indexSync: saveResult.indexSync,
      searchSync: saveResult.searchSync,
      errors: [...deleteResult.errors, ...saveResult.errors],
      warnings: saveResult.warnings,
    };
  },

  async onCollectionChanged(allowDefer = true): Promise<CatalogSyncResult> {
    const started = Date.now();
    const errors: string[] = [];
    let jobId: string | undefined;

    const sampleRecords = await loadListingRecords("en");
    const productCount = sampleRecords.length;

    if (allowDefer && shouldDeferCatalogSync(productCount)) {
      const job = await createCatalogSyncJob("full_catalog_sync", {
        locales: [...CATALOG_LOCALES],
      });
      jobId = job.id;
      return {
        ok: true,
        collectionSync: null,
        indexSync: null,
        searchSync: null,
        errors: [],
        warnings: ["Deferred to background job — run sync job to complete"],
        jobId,
      };
    }

    for (const locale of CATALOG_LOCALES) {
      const prefix = localePrefixFromCatalogLocale(locale);
      try {
        const result = await writeLocaleProductIndexes(locale, prefix, { gzip: true });
        await updateManifest(locale, result.count, result.signature);
        invalidateCatalogCaches(prefix);
      } catch (e) {
        errors.push(`${locale}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    invalidateProductCatalogIndex();
    invalidateProductIndexLoaderCache();

    try {
      await frameworkSearchIndexer.syncCatalogIndexes();
    } catch (e) {
      errors.push(`search: ${e instanceof Error ? e.message : String(e)}`);
    }

    const ok = errors.length === 0;
    await logCatalogSync({
      level: ok ? "info" : "error",
      operation: "onCollectionChanged",
      durationMs: Date.now() - started,
      message: ok ? "all locales rebuilt" : errors.join("; "),
      error: ok ? undefined : errors[0],
    });

    return {
      ok,
      collectionSync: null,
      indexSync: { count: productCount, mode: "full" },
      searchSync: { upserted: true },
      errors,
      warnings: [],
    };
  },

  async onBulkImportComplete(localePrefixes: string[]): Promise<CatalogSyncResult> {
    const errors: string[] = [];
    const unique = [...new Set(localePrefixes)];

    for (const localePrefix of unique) {
      const catalogLocale = catalogLocaleFromParam(localePrefix);
      const prefix = localePrefixFromCatalogLocale(catalogLocale);
      try {
        const result = await writeLocaleProductIndexes(catalogLocale, prefix, { gzip: true });
        await updateManifest(catalogLocale, result.count, result.signature);
        invalidateCatalogCaches(localePrefix);
      } catch (e) {
        errors.push(`${localePrefix}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    invalidateProductCatalogIndex();
    invalidateProductIndexLoaderCache();

    try {
      await frameworkSearchIndexer.syncCatalogIndexes();
    } catch (e) {
      errors.push(`search: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {
      ok: errors.length === 0,
      collectionSync: null,
      indexSync: null,
      searchSync: { upserted: true },
      errors,
      warnings: [],
    };
  },

  async runDeferredJob(jobId: string): Promise<CatalogSyncResult> {
    await updateCatalogSyncJob(jobId, {
      status: "running",
      startedAt: new Date().toISOString(),
    });

    try {
      const result = await this.onCollectionChanged(false);
      await updateCatalogSyncJob(jobId, {
        status: result.ok ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        error: result.errors[0],
        result: { errors: result.errors },
      });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateCatalogSyncJob(jobId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: msg,
      });
      return {
        ok: false,
        collectionSync: null,
        indexSync: null,
        searchSync: null,
        errors: [msg],
        warnings: [],
      };
    }
  },

  relPathFromAbs(absPath: string): string {
    const dataRoot = join(process.cwd(), "src", "data");
    return relative(dataRoot, absPath).replace(/\\/g, "/");
  },
};
