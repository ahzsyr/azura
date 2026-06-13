import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogLocaleFromParam } from "@/features/products/fs/product-fs-scan";
import { CATALOG_LOCALES, type CatalogLocale } from "@/features/catalog/locales";
import {
  productsIndexRoot,
  writeLocaleProductIndexes,
} from "@/features/products/index/product-index-builder";
import type { ProductIndexManifest } from "@/features/products/index/product-index-types";
import type { Product } from "@/features/products/types";
import { revalidateProductListing, revalidateProductSlug } from "@/services/cache";
import {
  catalogSyncOrchestrator,
  type CatalogSyncResult,
} from "@/features/catalog/sync/catalog-sync-orchestrator";
import { frameworkSearchIndexer } from "@/features/search-framework";
import { invalidateProductCatalogIndex } from "@/features/products/fs/product-catalog-index";
import { invalidateProductIndexLoaderCache } from "@/features/products/index/product-index-loader";
import { countOrphanIndexEntries } from "@/features/catalog/sync/catalog-validation";

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
    /* fresh manifest */
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.counts[locale] = count;
  manifest.signatures[locale] = signature;
  if (!manifest.locales.includes(locale)) manifest.locales.push(locale);

  await writeJsonAtomic(productsIndexRoot(), "manifest.json", manifest);
}

function catalogLocaleToUrlPrefix(locale: CatalogLocale): string {
  return locale === "ar-ae" ? "ar" : "en";
}

export async function rebuildAllCatalogProductIndexes(): Promise<{
  locales: Array<{
    locale: CatalogLocale;
    count: number;
    previousCount: number;
    orphansRemoved: number;
  }>;
}> {
  const locales: Array<{
    locale: CatalogLocale;
    count: number;
    previousCount: number;
    orphansRemoved: number;
  }> = [];

  for (const locale of CATALOG_LOCALES) {
    const prefix = catalogLocaleToUrlPrefix(locale);
    const before = await countOrphanIndexEntries(locale);
    const result = await rebuildProductIndexesForLocale(prefix);
    revalidateProductListing(prefix);
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
  const locale = catalogLocaleFromParam(localePrefix);
  const prefix = locale === "ar-ae" ? "ar" : "en";
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

export async function patchProductIndexesAfterSave(
  localePrefix: string,
  slug: string,
  product?: Product,
  opts?: { relPath?: string; mtimeMs?: number; oldSlug?: string },
): Promise<CatalogSyncResult> {
  if (!product) {
    return catalogSyncOrchestrator.onProductDeleted(localePrefix, slug);
  }
  return catalogSyncOrchestrator.onProductSaved(localePrefix, slug, product, opts);
}

export async function patchProductIndexesAfterDelete(
  localePrefix: string,
  slug: string,
  opts?: { oldSlug?: string },
): Promise<CatalogSyncResult> {
  return catalogSyncOrchestrator.onProductDeleted(localePrefix, slug, opts);
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
