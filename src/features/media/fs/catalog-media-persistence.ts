import "server-only";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Prisma } from "@prisma/client";
import type { MediaLibraryMeta } from "./types";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import { isCatalogFsWriteError } from "@/features/collections/collections-persistence";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";

export const CATALOG_MEDIA_NAMESPACE = "catalog-media";
export const CATALOG_MEDIA_META_KEY = "meta";
export const CATALOG_MEDIA_TOMBSTONES_KEY = "tombstones";

import { catalogSeedRoot } from "@/lib/catalog-seed-paths";

const META_PATH = resolve(catalogSeedRoot(), "media-library.json");

export type CatalogMediaMetaPayload = {
  meta: MediaLibraryMeta;
  updatedAt: string;
};

export type CatalogMediaTombstonesPayload = {
  filenames: string[];
  updatedAt: string;
};

export function preferCatalogMediaJsonStore(): boolean {
  if (useDatabaseOnlyCatalog()) return true;
  if (process.env.VERCEL) return true;
  if (process.env.CATALOG_USE_JSON_STORE === "1") return true;
  return false;
}

async function readMetaFromDisk(): Promise<MediaLibraryMeta> {
  if (isCloudNativeProduction() || useDatabaseOnlyCatalog()) return {};
  try {
    const raw = await readFile(META_PATH, "utf-8");
    return JSON.parse(raw) as MediaLibraryMeta;
  } catch {
    return {};
  }
}

async function tryWriteMetaToDisk(meta: MediaLibraryMeta): Promise<boolean> {
  if (preferCatalogMediaJsonStore() || isCloudNativeProduction()) return false;
  try {
    await mkdir(catalogSeedRoot(), { recursive: true });
    await writeFile(META_PATH, JSON.stringify(meta, null, 2), "utf-8");
    return true;
  } catch (error) {
    if (isCatalogFsWriteError(error)) return false;
    throw error;
  }
}

async function loadJsonStoreMeta(): Promise<MediaLibraryMeta | null> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const stored = await jsonStoreService.get<CatalogMediaMetaPayload>(
      CATALOG_MEDIA_NAMESPACE,
      CATALOG_MEDIA_META_KEY,
    );
    if (!stored?.meta || typeof stored.meta !== "object") return null;
    return stored.meta;
  } catch {
    return null;
  }
}

async function saveJsonStoreMeta(meta: MediaLibraryMeta): Promise<void> {
  const { jsonStoreService } = await import("@/features/storage/json-store.service");
  const payload: CatalogMediaMetaPayload = {
    meta,
    updatedAt: new Date().toISOString(),
  };
  await jsonStoreService.set(
    CATALOG_MEDIA_NAMESPACE,
    CATALOG_MEDIA_META_KEY,
    payload as unknown as Prisma.InputJsonValue,
  );
}

async function loadJsonStoreTombstones(): Promise<string[]> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const stored = await jsonStoreService.get<CatalogMediaTombstonesPayload>(
      CATALOG_MEDIA_NAMESPACE,
      CATALOG_MEDIA_TOMBSTONES_KEY,
    );
    return Array.isArray(stored?.filenames) ? stored.filenames : [];
  } catch {
    return [];
  }
}

async function saveJsonStoreTombstones(filenames: string[]): Promise<void> {
  const { jsonStoreService } = await import("@/features/storage/json-store.service");
  const payload: CatalogMediaTombstonesPayload = {
    filenames,
    updatedAt: new Date().toISOString(),
  };
  await jsonStoreService.set(
    CATALOG_MEDIA_NAMESPACE,
    CATALOG_MEDIA_TOMBSTONES_KEY,
    payload as unknown as Prisma.InputJsonValue,
  );
}

/** Merged catalog media metadata — JsonStore overlay wins on key conflicts. */
export async function readCatalogMediaMeta(): Promise<MediaLibraryMeta> {
  if (isCloudNativeProduction() || useDatabaseOnlyCatalog()) return {};
  const diskMeta = await readMetaFromDisk();
  const overlay = await loadJsonStoreMeta();
  if (overlay === null) return diskMeta;
  return { ...diskMeta, ...overlay };
}

/** Persist catalog media metadata — disk when writable, JsonStore on serverless or fallback. */
export async function writeCatalogMediaMeta(meta: MediaLibraryMeta): Promise<void> {
  if (isCloudNativeProduction() || useDatabaseOnlyCatalog()) return;
  const wroteDisk = await tryWriteMetaToDisk(meta);
  if (preferCatalogMediaJsonStore() || !wroteDisk) {
    await saveJsonStoreMeta(meta);
  }
}

export async function readCatalogMediaTombstones(): Promise<Set<string>> {
  const list = await loadJsonStoreTombstones();
  return new Set(list);
}

export async function addCatalogMediaTombstone(filename: string): Promise<void> {
  const current = await readCatalogMediaTombstones();
  if (current.has(filename)) return;
  current.add(filename);
  await saveJsonStoreTombstones(Array.from(current));
}
