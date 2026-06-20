import "server-only";

import { access, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Prisma } from "@prisma/client";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import type { Product } from "./types";
import { productJsonPath } from "./fs/product-fs-paths";
import {
  isCatalogFsWriteError,
  preferCatalogJsonStore,
} from "@/features/collections/collections-persistence";
import {
  assertFilesystemPersistenceAllowed,
  isCloudNativeProduction,
} from "@/lib/cloud-native-guard";

export const CATALOG_PRODUCTS_NAMESPACE = "catalog-products";

export function productStoreKey(locale: string, slug: string): string {
  return `${locale.toLowerCase()}:${slug}`;
}

export function parseProductStoreKey(key: string): { locale: string; slug: string } | null {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  return { locale: key.slice(0, i), slug: key.slice(i + 1) };
}

async function loadJsonStoreProduct(locale: string, slug: string): Promise<Product | null> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const stored = await jsonStoreService.get<Product>(
      CATALOG_PRODUCTS_NAMESPACE,
      productStoreKey(locale, slug),
    );
    return stored && typeof stored === "object" ? stored : null;
  } catch {
    return null;
  }
}

async function saveJsonStoreProduct(locale: string, slug: string, product: Product): Promise<void> {
  const { jsonStoreService } = await import("@/features/storage/json-store.service");
  await jsonStoreService.set(
    CATALOG_PRODUCTS_NAMESPACE,
    productStoreKey(locale, slug),
    product as unknown as Prisma.InputJsonValue,
  );
}

export async function listJsonStoreProducts(
  locale?: string,
): Promise<Array<{ locale: string; slug: string; product: Product }>> {
  if (useDatabaseOnlyCatalog()) return [];
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const rows = await jsonStoreService.listNamespace(CATALOG_PRODUCTS_NAMESPACE);
    const locFilter = locale?.toLowerCase();
    const out: Array<{ locale: string; slug: string; product: Product }> = [];

    for (const row of rows) {
      const parsed = parseProductStoreKey(row.key);
      if (!parsed) continue;
      if (locFilter && parsed.locale !== locFilter) continue;
      if (!row.data || typeof row.data !== "object") continue;
      const product = row.data as unknown as Product;
      out.push({ locale: parsed.locale, slug: parsed.slug, product });
    }

    return out;
  } catch {
    return [];
  }
}

export async function loadProductOverlay(locale: string, slug: string): Promise<Product | null> {
  return loadJsonStoreProduct(locale, slug);
}

export async function productExistsInOverlay(locale: string, slug: string): Promise<boolean> {
  return (await loadJsonStoreProduct(locale, slug)) !== null;
}

async function writeProductToDisk(absPath: string, product: Product): Promise<void> {
  if (isCloudNativeProduction()) {
    assertFilesystemPersistenceAllowed("saveProductJson");
  }
  const dir = dirname(absPath);
  await mkdir(dir, { recursive: true });
  const tmp = `${absPath}.tmp.${process.pid}.${Math.random().toString(16).slice(2)}`;
  try {
    await writeFile(tmp, JSON.stringify(product, null, 2), "utf-8");
    await rename(tmp, absPath);
  } catch (e) {
    try {
      await unlink(tmp);
    } catch {
      /* ignore */
    }
    throw e;
  }
}

/** Persist a product JSON — disk when writable, JsonStore on serverless. Not used in Supabase DB mode. */
export async function saveProductJson(
  locale: string,
  slug: string,
  product: Product,
): Promise<"disk" | "json-store"> {
  if (useDatabaseOnlyCatalog()) {
    throw new Error(
      "saveProductJson is disabled in database-only catalog mode; use saveProductToDb instead",
    );
  }

  const absPath = productJsonPath(locale, slug);

  if (preferCatalogJsonStore()) {
    await saveJsonStoreProduct(locale, slug, product);
    return "json-store";
  }

  try {
    await writeProductToDisk(absPath, product);
    return "disk";
  } catch (error) {
    if (isCatalogFsWriteError(error)) {
      await saveJsonStoreProduct(locale, slug, product);
      return "json-store";
    }
    throw error;
  }
}

export async function resolveReadableProductPath(
  locale: string,
  slug: string,
): Promise<string | null> {
  if (await productExistsInOverlay(locale, slug)) {
    return productJsonPath(locale, slug);
  }
  try {
    await access(productJsonPath(locale, slug));
    return productJsonPath(locale, slug);
  } catch {
    return null;
  }
}
