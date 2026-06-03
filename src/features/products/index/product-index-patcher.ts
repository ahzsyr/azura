import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogLocaleFromParam } from "@/features/products/fs/product-fs-scan";
import type { CatalogLocale } from "@/features/catalog/locales";
import {
  productsIndexRoot,
  writeLocaleProductIndexes,
} from "@/features/products/index/product-index-builder";
import type { ProductIndexManifest } from "@/features/products/index/product-index-types";
import { invalidateProductCatalogIndex } from "@/features/products/fs/product-catalog-index";
import type { Product } from "@/features/products/types";
import { revalidateProductListing, revalidateProductSlug } from "@/services/cache";
import { frameworkSearchIndexer } from "@/features/search-framework";

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
  if (!manifest.locales.includes(locale)) {
    manifest.locales.push(locale);
  }

  await writeJsonAtomic(productsIndexRoot(), "manifest.json", manifest);
}

export async function rebuildProductIndexesForLocale(
  localePrefix: string,
): Promise<{ count: number; signature: string }> {
  const locale = catalogLocaleFromParam(localePrefix);
  const prefix = locale === "ar-ae" ? "ar" : "en";
  const result = await writeLocaleProductIndexes(locale, prefix, { gzip: true });
  await updateManifest(locale, result.count, result.signature);
  invalidateProductCatalogIndex();
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
  _product?: Product,
): Promise<void> {
  void _product;
  await rebuildProductIndexesForLocale(localePrefix);
  revalidateProductListing(localePrefix);
  revalidateProductSlug(localePrefix, slug);
}

export async function patchProductIndexesAfterDelete(
  localePrefix: string,
  slug: string,
): Promise<void> {
  await rebuildProductIndexesForLocale(localePrefix);
  revalidateProductListing(localePrefix);
  revalidateProductSlug(localePrefix, slug);
}

export async function patchProductIndexesFromProduct(
  localePrefix: string,
  slug: string,
  product: Product,
): Promise<void> {
  await patchProductIndexesAfterSave(localePrefix, slug, product);
}
