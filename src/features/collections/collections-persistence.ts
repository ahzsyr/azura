import "server-only";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Prisma } from "@prisma/client";
import type { Collection } from "./types";

export const CATALOG_COLLECTIONS_NAMESPACE = "catalog-collections";
export const CATALOG_COLLECTIONS_GLOBAL_KEY = "global";

const COLLECTIONS_JSON = resolve(process.cwd(), "src", "data", "collections.json");

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

/** Load catalog collections — JsonStore overlay wins over bundled collections.json. */
export async function loadCollections(): Promise<Collection[]> {
  const overlay = await loadJsonStoreCollections();
  if (overlay !== null) return overlay;
  return readCollectionsFromBundledFile();
}

/** Persist catalog collections — writes disk when writable, otherwise JsonStore (serverless). */
export async function saveCollections(collections: Collection[]): Promise<void> {
  const preferJsonStore = preferCatalogJsonStore();
  let wroteFile = false;

  if (!preferJsonStore) {
    wroteFile = await tryWriteCollectionsFile(collections);
  }

  if (preferJsonStore || !wroteFile) {
    await saveJsonStoreCollections(collections);
  }
}

export async function collectionsUseJsonStore(): Promise<boolean> {
  if (preferCatalogJsonStore()) return true;
  const overlay = await loadJsonStoreCollections();
  return overlay !== null;
}
