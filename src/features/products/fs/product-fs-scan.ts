import { existsSync } from "node:fs";
import { opendir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { slugFromProductJsonFilename } from "./product-fs-parse";
import {
  CATALOG_LOCALES,
  urlPrefixToCatalogLocale,
  type CatalogLocale,
} from "@/features/catalog/locales";

const SKIP_DIRS = new Set(["node_modules", ".git"]);

export function localeProductsDir(locale: CatalogLocale): string {
  return resolve(process.cwd(), "src", "data", locale, "products");
}

export function legacyProductsDir(): string {
  return resolve(process.cwd(), "src", "data", "products");
}

export function catalogLocaleFromParam(param: string): CatalogLocale {
  return urlPrefixToCatalogLocale(param);
}

async function* walkDir(dirPath: string): AsyncGenerator<{ absPath: string; slug: string }> {
  let dir;
  try {
    dir = await opendir(dirPath);
  } catch {
    return;
  }
  const subdirs: string[] = [];
  for await (const entry of dir) {
    const full = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) subdirs.push(full);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      yield { absPath: full, slug: slugFromProductJsonFilename(entry.name) };
    }
  }
  subdirs.sort();
  for (const sub of subdirs) {
    yield* walkDir(sub);
  }
}

export async function* walkProductJsonFiles(
  productsRoot: string,
): AsyncGenerator<{ absPath: string; slug: string }> {
  if (!existsSync(productsRoot)) return;
  const collected: Array<{ absPath: string; slug: string }> = [];
  for await (const item of walkDir(productsRoot)) {
    collected.push(item);
  }
  collected.sort((a, b) => a.absPath.localeCompare(b.absPath));
  for (const item of collected) yield item;
}

export async function resolveProductJsonPath(
  locale: string,
  slug: string,
): Promise<string | null> {
  const { resolveIndexEntryForLocale } = await import("./product-catalog-index");
  const entry = await resolveIndexEntryForLocale(locale, slug);
  return entry?.absPath ?? null;
}

export async function* walkAllCatalogProductFiles(): AsyncGenerator<{
  absPath: string;
  slug: string;
  locale: CatalogLocale | null;
}> {
  for (const locale of CATALOG_LOCALES) {
    for await (const item of walkProductJsonFiles(localeProductsDir(locale))) {
      yield { ...item, locale };
    }
  }
  for await (const item of walkProductJsonFiles(legacyProductsDir())) {
    yield { ...item, locale: null };
  }
}
