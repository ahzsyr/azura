import "server-only";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Prisma } from "@prisma/client";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import type { Collection } from "./types";
import {
  assertFilesystemPersistenceAllowed,
  isCloudNativeProduction,
} from "@/lib/cloud-native-guard";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";

export const CATALOG_COLLECTIONS_NAMESPACE = "catalog-collections";
export const CATALOG_COLLECTIONS_GLOBAL_KEY = "global";

const COLLECTIONS_JSON = resolve(catalogSeedRoot(), "collections.json");

export type CollectionsStorePayload = {
  collections: Collection[];
  updatedAt: string;
};

function parseCollectionsPayload(data: unknown): Collection[] | null {
  if (!data) return null;
  if (Array.isArray(data)) return data as Collection[];
  if (typeof data === "object" && data !== null && "collections" in data) {
    const list = (data as CollectionsStorePayload).collections;
    return Array.isArray(list) ? list : null;
  }
  return null;
}

export function isReadOnlyFsError(error: unknown): boolean {
  return isCatalogFsWriteError(error);
}

/** True when catalog data cannot be written to disk (Vercel /var/task, EROFS, missing parents). */
export function isCatalogFsWriteError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: string }).code) : "";
  return (
    code === "EROFS" ||
    code === "EPERM" ||
    code === "EACCES" ||
    code === "ENOENT" ||
    code === "ENOTDIR"
  );
}

export function preferCatalogJsonStore(): boolean {
  if (useDatabaseOnlyCatalog()) return true;
  if (process.env.VERCEL) return true;
  if (process.env.CATALOG_USE_JSON_STORE === "1") return true;
  return false;
}

export async function safeMkdirCatalogDir(dir: string): Promise<boolean> {
  if (preferCatalogJsonStore()) return false;
  try {
    await mkdir(dir, { recursive: true });
    return true;
  } catch (error) {
    if (isCatalogFsWriteError(error)) return false;
    throw error;
  }
}

async function readCollectionsFromBundledFile(): Promise<Collection[]> {
  try {
    const raw = JSON.parse(await readFile(COLLECTIONS_JSON, "utf-8"));
    return Array.isArray(raw) ? (raw as Collection[]) : [];
  } catch {
    return [];
  }
}

async function tryWriteCollectionsFile(collections: Collection[]): Promise<boolean> {
  if (isCloudNativeProduction()) {
    assertFilesystemPersistenceAllowed("saveCollections");
  }
  try {
    await mkdir(resolve(COLLECTIONS_JSON, ".."), { recursive: true });
    await writeFile(COLLECTIONS_JSON, JSON.stringify(collections, null, 2), "utf-8");
    return true;
  } catch (error) {
    if (isReadOnlyFsError(error)) return false;
    throw error;
  }
}

async function loadJsonStoreCollections(): Promise<Collection[] | null> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const stored = await jsonStoreService.get<CollectionsStorePayload | Collection[]>(
      CATALOG_COLLECTIONS_NAMESPACE,
      CATALOG_COLLECTIONS_GLOBAL_KEY,
    );
    return parseCollectionsPayload(stored);
  } catch {
    return null;
  }
}

async function saveJsonStoreCollections(collections: Collection[]): Promise<void> {
  const { jsonStoreService } = await import("@/features/storage/json-store.service");
  const payload: CollectionsStorePayload = {
    collections,
    updatedAt: new Date().toISOString(),
  };
  await jsonStoreService.set(
    CATALOG_COLLECTIONS_NAMESPACE,
    CATALOG_COLLECTIONS_GLOBAL_KEY,
    payload as unknown as Prisma.InputJsonValue,
  );
}

/** Load catalog collections — Prisma when Supabase, else JsonStore overlay or bundled file. */
export async function loadCollections(): Promise<Collection[]> {
  if (useDatabaseOnlyCatalog()) {
    const { catalogCollectionRepository } = await import(
      "@/repositories/catalog-collection.repository"
    );
    return catalogCollectionRepository.findAllGlobal();
  }

  if (isCloudNativeProduction()) {
    return [];
  }

  const overlay = await loadJsonStoreCollections();
  if (overlay !== null) return overlay;
  return readCollectionsFromBundledFile();
}

/** Persist catalog collections — Prisma when Supabase, else disk/JsonStore. */
export async function saveCollections(collections: Collection[]): Promise<void> {
  if (useDatabaseOnlyCatalog()) {
    const { catalogCollectionRepository } = await import(
      "@/repositories/catalog-collection.repository"
    );
    await catalogCollectionRepository.saveAll(collections);
    return;
  }

  const preferJsonStore = preferCatalogJsonStore();
  let wroteFile = false;

  if (!preferJsonStore) {
    wroteFile = await tryWriteCollectionsFile(collections);
  }

  if (preferJsonStore || !wroteFile) {
    await saveJsonStoreCollections(collections);
  }
}

/** Upsert a single collection without rewriting the full catalog (fast path for admin edits). */
export async function upsertCatalogCollection(
  col: Collection,
  options?: number | { sortOrder?: number; originalSlug?: string },
): Promise<{ reparentedChildren: number }> {
  const opts =
    typeof options === "number" ? { sortOrder: options } : (options ?? {});
  const originalSlug = opts.originalSlug?.trim();
  const lookupSlug = originalSlug || col.slug;
  let reparentedChildren = 0;

  if (useDatabaseOnlyCatalog()) {
    const { catalogCollectionRepository } = await import(
      "@/repositories/catalog-collection.repository"
    );
    const all = await catalogCollectionRepository.findAllGlobal();
    const existingIndex = all.findIndex((c) => c.slug === col.slug);
    const order =
      opts.sortOrder ?? (existingIndex >= 0 ? existingIndex : all.length);

    if (originalSlug && originalSlug !== col.slug) {
      reparentedChildren = await catalogCollectionRepository.replaceCollection(
        originalSlug,
        col,
        order,
      );
      return { reparentedChildren };
    }

    await catalogCollectionRepository.upsert(col, order);
    return { reparentedChildren: 0 };
  }

  const cols = await loadCollections();
  const now = col.updatedAt ?? new Date().toISOString();

  if (originalSlug && originalSlug !== col.slug) {
    for (let i = 0; i < cols.length; i++) {
      const child = cols[i];
      if ((child.parentSlug ?? "").trim() === originalSlug) {
        cols[i] = { ...child, parentSlug: col.slug, updatedAt: now };
        reparentedChildren += 1;
      }
    }
  }

  const idx = cols.findIndex((c) => c.slug === lookupSlug || c.id === lookupSlug);
  if (idx >= 0) cols[idx] = col;
  else cols.push(col);
  await saveCollections(cols);
  return { reparentedChildren };
}

/** Load direct children of a parent slug (after loadCollections). */
export async function listChildCollections(parentSlug: string): Promise<Collection[]> {
  const parent = parentSlug.trim();
  if (!parent) return [];
  const cols = await loadCollections();
  return cols.filter((c) => (c.parentSlug ?? "").trim() === parent);
}

/** Delete a single collection without rewriting the full catalog (fast path for admin deletes). */
export async function deleteCatalogCollection(slug: string): Promise<void> {
  const key = slug.trim();
  if (!key) throw new Error("slug required");

  if (useDatabaseOnlyCatalog()) {
    const { catalogCollectionRepository } = await import(
      "@/repositories/catalog-collection.repository"
    );
    const deleted = await catalogCollectionRepository.deleteBySlug(key);
    if (!deleted) throw new Error("Collection not found");
    return;
  }

  const cols = await loadCollections();
  if (!cols.some((c) => c.slug === key || c.id === key)) {
    throw new Error("Collection not found");
  }
  await saveCollections(cols.filter((c) => c.slug !== key && c.id !== key));
}

export async function collectionsUseJsonStore(): Promise<boolean> {
  if (preferCatalogJsonStore()) return true;
  const overlay = await loadJsonStoreCollections();
  return overlay !== null;
}
