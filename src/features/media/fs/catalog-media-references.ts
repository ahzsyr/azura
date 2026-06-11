import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { MediaUsage } from "./types";
import { CATALOG_LOCALES } from "@/features/catalog/locales";
import { walkProductJsonFiles } from "@/features/products/fs/product-fs-scan";

const DATA_DIR = resolve(process.cwd(), "src/data");

export async function replaceUrlInJson(
  filePath: string,
  oldUrl: string,
  newUrl: string,
): Promise<boolean> {
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
  let updatedProducts = 0;
  let updatedCollections = 0;

  for (const locale of CATALOG_LOCALES) {
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

  for (const locale of CATALOG_LOCALES) {
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
  for (const sub of ["images", "videos", "documents", "audio", "other"]) {
    possibleUrls.push(`/uploads/${sub}/${filename}`);
  }

  const usages: MediaUsage[] = [];

  async function scanJson(filePath: string, check: (raw: string) => boolean, usage: MediaUsage) {
    try {
      const raw = await readFile(filePath, "utf-8");
      if (check(raw)) usages.push(usage);
    } catch {
      /* skip */
    }
  }

  for (const locale of CATALOG_LOCALES) {
    const prodDir = join(DATA_DIR, locale, "products");
    try {
      for await (const { absPath, slug } of walkProductJsonFiles(prodDir)) {
        await scanJson(absPath, (raw) => possibleUrls.some((u) => raw.includes(u)), {
          type: "product",
          id: slug,
          label: slug,
          url: `/admin/catalog-products?slug=${slug}`,
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
    url: "/admin/catalog-collections",
  });

  return usages;
}
