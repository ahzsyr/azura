import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { urlPrefixToCatalogLocale } from "@/features/catalog/locales";
import type { Collection } from "./types";

async function readJson<T>(absPath: string): Promise<T | null> {
  try {
    const raw = await readFile(absPath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readBundledCollectionsFile(): Promise<Collection[]> {
  const path = join(process.cwd(), "src", "data", "collections.json");
  try {
    const raw = JSON.parse(await readFile(path, "utf-8"));
    return Array.isArray(raw) ? (raw as Collection[]) : [];
  } catch {
    return [];
  }
}

async function readHierarchyExportCollections(): Promise<Collection[]> {
  const path = join(process.cwd(), "src", "data", "collections", "brt-networking-hierarchy.json");
  const doc = await readJson<{ collections?: Collection[] }>(path);
  return Array.isArray(doc?.collections) ? doc.collections : [];
}

async function tryLoadCollectionsFromPersistence(): Promise<Collection[]> {
  try {
    const { loadCollections } = await import("./collections-persistence");
    return await loadCollections();
  } catch {
    return [];
  }
}

/** Global collections for index build — JsonStore when available, else bundled/hierarchy files. */
async function loadGlobalCollections(): Promise<Collection[]> {
  const fromPersistence = await tryLoadCollectionsFromPersistence();
  if (fromPersistence.length > 0) return fromPersistence;

  const fromFile = await readBundledCollectionsFile();
  if (fromFile.length > 0) return fromFile;

  return readHierarchyExportCollections();
}

async function loadLocaleOverride(
  catalogLocale: string,
  slug: string,
): Promise<Partial<Collection> | null> {
  const path = join(process.cwd(), "src", "data", catalogLocale, "collections", `${slug}.json`);
  return readJson<Partial<Collection>>(path);
}

function mergeCollection(base: Collection, override: Partial<Collection> | null): Collection {
  if (!override) return base;
  return {
    ...base,
    ...override,
    id: override.id ?? base.id,
    slug: override.slug ?? base.slug,
    seo: { ...base.seo, ...override.seo },
    conditions: override.conditions ?? base.conditions,
  };
}

export async function loadCollectionsFromFs(localePrefix: string): Promise<Collection[]> {
  const catalogLocale = urlPrefixToCatalogLocale(localePrefix);
  const global = await loadGlobalCollections();
  const merged: Collection[] = [];
  for (const col of global) {
    const override = await loadLocaleOverride(catalogLocale, col.slug);
    merged.push(mergeCollection(col, override));
  }
  return merged;
}

export async function collectionsJsonExists(): Promise<boolean> {
  return fileExists(join(process.cwd(), "src", "data", "collections.json"));
}
