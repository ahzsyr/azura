import { existsSync } from "node:fs";
import { opendir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";
import { slugFromProductJsonFilename } from "./product-fs-parse";
import { getCatalogLocaleCodes, prefixToCatalogLocaleCode } from "@/features/catalog/locales";

const SKIP_DIRS = new Set(["node_modules", ".git"]);

export function localeProductsDir(locale: string): string {
  return resolve(catalogSeedRoot(), locale, "products");
}

export function legacyProductsDir(): string {
  return resolve(catalogSeedRoot(), "products");
}

export async function catalogLocaleFromParam(param: string): Promise<string> {
  return prefixToCatalogLocaleCode(param);
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
  locale: string | null;
}> {
  for (const locale of await getCatalogLocaleCodes()) {
    for await (const item of walkProductJsonFiles(localeProductsDir(locale))) {
      yield { ...item, locale };
    }
  }
  for await (const item of walkProductJsonFiles(legacyProductsDir())) {
    yield { ...item, locale: null };
  }
}
