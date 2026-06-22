import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Prisma } from "@prisma/client";
import type { MediaUsage } from "./types";
import { getCatalogLocaleCodes } from "@/features/catalog/locales";
import { walkProductJsonFiles } from "@/features/products/fs/product-fs-scan";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";

const DATA_DIR = catalogSeedRoot();

function payloadContainsUrl(payload: unknown, urls: string[]): boolean {
  const raw = JSON.stringify(payload);
  return urls.some((u) => raw.includes(u));
}

async function replaceUrlInProductPayload(
  canonicalSlug: string,
  oldUrl: string,
  newUrl: string,
): Promise<boolean> {
  const { productRepository } = await import("@/repositories/product.repository");
  const row = await productRepository.findByCanonicalSlug(canonicalSlug);
  if (!row) return false;
  const raw = JSON.stringify(row.payload);
  if (!raw.includes(oldUrl)) return false;
  const nextPayload = JSON.parse(raw.replaceAll(oldUrl, newUrl)) as Prisma.InputJsonValue;
  const { prisma } = await import("@/lib/prisma");
  await prisma.product.update({
    where: { canonicalSlug },
    data: { payload: nextPayload },
  });
  return true;
}

async function replaceUrlInCollections(oldUrl: string, newUrl: string): Promise<number> {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.catalogCollection.findMany();
  let updated = 0;
  for (const row of rows) {
    const raw = JSON.stringify(row.metadata ?? {});
    if (!raw.includes(oldUrl)) continue;
    const metadata = JSON.parse(raw.replaceAll(oldUrl, newUrl)) as Prisma.InputJsonValue;
    await prisma.catalogCollection.update({
      where: { id: row.id },
      data: { metadata },
    });
    updated += 1;
  }
  return updated;
}

export async function replaceUrlInJson(
  filePath: string,
  oldUrl: string,
  newUrl: string,
): Promise<boolean> {
  if (isCloudNativeProduction()) return false;
  try {
    const raw = await readFile(filePath, "utf-8");
    if (!raw.includes(oldUrl)) return false;
    await writeFile(filePath, raw.replaceAll(oldUrl, newUrl), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function updateAllCatalogReferences(oldUrl: string, newUrl: string) {
  if (useCatalogProductsDb()) {
    let updatedProducts = 0;
    const { productRepository } = await import("@/repositories/product.repository");

    const rows = await productRepository.findAll();
      for (const row of rows) {
        if (await replaceUrlInProductPayload(row.canonicalSlug, oldUrl, newUrl)) {
          updatedProducts += 1;
        }
      }

    const updatedCollections = await replaceUrlInCollections(oldUrl, newUrl);
    return { updatedProducts, updatedCollections };
  }

  let updatedProducts = 0;
  let updatedCollections = 0;

  for (const locale of await getCatalogLocaleCodes()) {
    const prodDir = join(DATA_DIR, locale, "products");
    try {
      for await (const { absPath } of walkProductJsonFiles(prodDir)) {
        if (await replaceUrlInJson(absPath, oldUrl, newUrl)) updatedProducts++;
      }
    } catch {
      /* skip */
    }
  }

  const colPath = join(DATA_DIR, "collections.json");
  if (await replaceUrlInJson(colPath, oldUrl, newUrl)) updatedCollections++;

  for (const locale of await getCatalogLocaleCodes()) {
    const colDir = join(DATA_DIR, locale, "collections");
    try {
      const { readdir } = await import("node:fs/promises");
      const files = await readdir(colDir);
      for (const f of files) {
        if (!f.endsWith(".json")) continue;
        if (await replaceUrlInJson(join(colDir, f), oldUrl, newUrl)) updatedCollections++;
      }
    } catch {
      /* skip */
    }
  }

  return { updatedProducts, updatedCollections };
}

export async function findCatalogMediaUsages(filename: string): Promise<MediaUsage[]> {
  const possibleUrls: string[] = [];
  for (const sub of ["images", "videos", "documents", "audio", "other", "svg"]) {
    possibleUrls.push(`/uploads/${sub}/${filename}`);
  }

  const usages: MediaUsage[] = [];

  if (useCatalogProductsDb()) {
    const { productRepository } = await import("@/repositories/product.repository");
    const rows = await productRepository.findAll();
      for (const row of rows) {
        if (payloadContainsUrl(row.payload, possibleUrls)) {
          usages.push({
            type: "product",
            id: row.canonicalSlug,
            label: row.canonicalSlug,
            url: `/admin/products?slug=${row.canonicalSlug}`,
          });
        }
      }

    const { prisma } = await import("@/lib/prisma");
    const collectionRows = await prisma.catalogCollection.findMany();
    for (const row of collectionRows) {
      if (payloadContainsUrl(row.metadata, possibleUrls)) {
        usages.push({
          type: "collection",
          id: row.slug,
          label: row.slug,
          url: "/admin/collections",
        });
      }
    }

    return usages;
  }

  async function scanJson(filePath: string, check: (raw: string) => boolean, usage: MediaUsage) {
    try {
      const raw = await readFile(filePath, "utf-8");
      if (check(raw)) usages.push(usage);
    } catch {
      /* skip */
    }
  }

  for (const locale of await getCatalogLocaleCodes()) {
    const prodDir = join(DATA_DIR, locale, "products");
    try {
      for await (const { absPath, slug } of walkProductJsonFiles(prodDir)) {
        await scanJson(absPath, (raw) => possibleUrls.some((u) => raw.includes(u)), {
          type: "product",
          id: slug,
          label: slug,
          url: `/admin/products?slug=${slug}`,
        });
      }
    } catch {
      /* skip */
    }
  }

  const colPath = join(DATA_DIR, "collections.json");
  await scanJson(colPath, (raw) => possibleUrls.some((u) => raw.includes(u)), {
    type: "collection",
    id: "collections.json",
    label: "Collections registry",
    url: "/admin/collections",
  });

  return usages;
}
