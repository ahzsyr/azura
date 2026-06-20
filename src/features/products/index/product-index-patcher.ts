import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogLocaleFromParam } from "@/features/products/fs/product-fs-scan";
import { getCatalogLocaleCodes } from "@/features/catalog/locales";
import { localeService } from "@/features/i18n/locale.service";
import { resolveCodeToPrefix } from "@/i18n/locale-config";
import {
  productsIndexRoot,
  writeLocaleProductIndexes,
} from "@/features/products/index/product-index-builder";
import type { ProductIndexManifest } from "@/features/products/index/product-index-types";
import {
  PRODUCT_INDEX_SEMANTIC_VERSIONS,
  PRODUCT_INDEX_VERSION,
} from "@/features/products/index/product-index-types";
import type { Product } from "@/features/products/types";
import { revalidateProductListing } from "@/services/cache";
import {
  catalogSyncOrchestrator,
  type CatalogSyncResult,
} from "@/features/catalog/sync/catalog-sync-orchestrator";
import { frameworkSearchIndexer } from "@/features/search-framework";
import { invalidateProductCatalogIndex } from "@/features/products/fs/product-catalog-index";
import { invalidateProductIndexLoaderCache } from "@/features/products/index/product-index-loader";
import { countOrphanIndexEntries } from "@/features/catalog/sync/catalog-validation";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { productPath } from "@/features/seo/triggers/path-resolver";

async function writeJsonAtomic(dir: string, filename: string, data: unknown): Promise<void> {
  const { mkdir, rename } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });
  const target = join(dir, filename);
  const temp = `${target}.tmp`;
  await writeFile(temp, JSON.stringify(data), "utf-8");
  await rename(temp, target);
}

async function updateManifest(locale: string, count: number, signature: string): Promise<void> {
  const manifestPath = join(productsIndexRoot(), "manifest.json");
  let manifest: ProductIndexManifest = {
    version: PRODUCT_INDEX_VERSION,
    semanticVersions: PRODUCT_INDEX_SEMANTIC_VERSIONS,
    generatedAt: new Date().toISOString(),
    locales: [locale],
    counts: { [locale]: count },
    signatures: { [locale]: signature },
  };

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as ProductIndexManifest;
  } catch {
    /* fresh manifest */
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.version = PRODUCT_INDEX_VERSION;
  manifest.semanticVersions = PRODUCT_INDEX_SEMANTIC_VERSIONS;
  manifest.counts[locale] = count;
  manifest.signatures[locale] = signature;
  if (!manifest.locales.includes(locale)) manifest.locales.push(locale);

  await writeJsonAtomic(productsIndexRoot(), "manifest.json", manifest);
}

async function catalogLocaleToUrlPrefix(locale: string): Promise<string> {
  const enabled = await localeService.listEnabled();
  return resolveCodeToPrefix(locale, enabled);
}

export async function rebuildAllCatalogProductIndexes(): Promise<{
  locales: Array<{
    locale: string;
    count: number;
    previousCount: number;
    orphansRemoved: number;
  }>;
}> {
  const locales: Array<{
    locale: string;
    count: number;
    previousCount: number;
    orphansRemoved: number;
  }> = [];

  for (const locale of await getCatalogLocaleCodes()) {
    const prefix = await catalogLocaleToUrlPrefix(locale);
    const before = await countOrphanIndexEntries(locale);
    const result = await rebuildProductIndexesForLocale(prefix);
    revalidateProductListing(prefix);
    await seoTriggerService.handle({ type: "content.sitemapChanged", entityType: "PRODUCT" });
    locales.push({
      locale,
      count: result.count,
      previousCount: before.indexCount,
      orphansRemoved: before.orphans.length,
    });
  }

  return { locales };
}

export async function rebuildProductIndexesForLocale(
  localePrefix: string,
): Promise<{ count: number; signature: string }> {
  const locale = await catalogLocaleFromParam(localePrefix);
  const prefix = await catalogLocaleToUrlPrefix(locale);
  const result = await writeLocaleProductIndexes(locale, prefix, { gzip: true });
  await updateManifest(locale, result.count, result.signature);
  invalidateProductCatalogIndex();
  invalidateProductIndexLoaderCache();
  try {
    await frameworkSearchIndexer.syncCatalogIndexes();
  } catch (err) {
    console.warn("[search] catalog sync after product index failed", err);
  }
  return result;
}

export async function patchProductIndexesAfterPatch(
  localePrefix: string,
  slug: string,
  product: Product,
  appliedPaths: string[],
  opts?: { relPath?: string; mtimeMs?: number; oldSlug?: string },
): Promise<CatalogSyncResult> {
  const result = await catalogSyncOrchestrator.onProductPatched(localePrefix, slug, product, appliedPaths, opts);
  if (opts?.oldSlug) {
    await seoTriggerService.handle({
      type: "content.slugChanged",
      entityType: "PRODUCT",
      locale: localePrefix,
      oldPath: productPath(localePrefix, opts.oldSlug),
      newPath: productPath(localePrefix, slug),
    });
  } else {
    await seoTriggerService.handle({
      type: "content.sitemapChanged",
      entityType: "PRODUCT",
      locale: localePrefix,
      path: productPath(localePrefix, slug),
    });
  }
  return result;
}

export async function patchProductIndexesAfterSave(
  localePrefix: string,
  slug: string,
  product?: Product,
  opts?: { relPath?: string; mtimeMs?: number; oldSlug?: string },
): Promise<CatalogSyncResult> {
  if (!product) {
    return catalogSyncOrchestrator.onProductDeleted(localePrefix, slug);
  }
  const result = await catalogSyncOrchestrator.onProductSaved(localePrefix, slug, product, opts);
  if (opts?.oldSlug) {
    await seoTriggerService.handle({
      type: "content.slugChanged",
      entityType: "PRODUCT",
      locale: localePrefix,
      oldPath: productPath(localePrefix, opts.oldSlug),
      newPath: productPath(localePrefix, slug),
    });
  } else {
    await seoTriggerService.handle({
      type: "content.published",
      entityType: "PRODUCT",
      locale: localePrefix,
      path: productPath(localePrefix, slug),
    });
  }
  return result;
}

export async function patchProductIndexesAfterDelete(
  localePrefix: string,
  slug: string,
  opts?: { oldSlug?: string },
): Promise<CatalogSyncResult> {
  const result = await catalogSyncOrchestrator.onProductDeleted(localePrefix, slug, opts);
  await seoTriggerService.handle({
    type: "content.deleted",
    entityType: "PRODUCT",
    locale: localePrefix,
    path: productPath(localePrefix, opts?.oldSlug ?? slug),
  });
  return result;
}

export async function patchProductIndexesFromProduct(
  localePrefix: string,
  slug: string,
  product: Product,
  opts?: { relPath?: string; mtimeMs?: number; oldSlug?: string },
): Promise<CatalogSyncResult> {
  return patchProductIndexesAfterSave(localePrefix, slug, product, opts);
}

export type { CatalogSyncResult } from "@/features/catalog/sync/catalog-sync-orchestrator";
