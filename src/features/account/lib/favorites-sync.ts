"use client";

import type { FavoriteEntityType } from "@prisma/client";

const PRODUCT_KEY = "az_saved";
const CONTENT_KEY = "az_saved_content";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeList(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function getLocalProductFavorites(): string[] {
  return readList(PRODUCT_KEY);
}

export function getLocalContentFavorites(): string[] {
  return readList(CONTENT_KEY);
}

export function isInLocalProductFavorites(entityId: string): boolean {
  return getLocalProductFavorites().includes(entityId);
}

export function isInLocalContentFavorites(entityId: string): boolean {
  return getLocalContentFavorites().includes(entityId);
}

function toggleLocal(key: string, entityId: string): boolean {
  const list = readList(key);
  const has = list.includes(entityId);
  const next = has ? list.filter((id) => id !== entityId) : [...list, entityId];
  writeList(key, next);
  return !has;
}

export function toggleLocalProductFavorite(entityId: string): boolean {
  return toggleLocal(PRODUCT_KEY, entityId);
}

export function toggleLocalContentFavorite(entityId: string): boolean {
  return toggleLocal(CONTENT_KEY, entityId);
}

export async function mergeLocalFavoritesToServer(locale: string): Promise<void> {
  const products = getLocalProductFavorites();
  const contentItems = getLocalContentFavorites();
  if (products.length === 0 && contentItems.length === 0) return;
  try {
    await fetch("/api/account/favorites/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products, contentItems, locale }),
    });
  } catch {
    /* best-effort */
  }
}

export async function toggleFavorite(opts: {
  entityType: FavoriteEntityType;
  entityId: string;
  locale: string;
  isLoggedIn: boolean;
}): Promise<boolean> {
  const { entityType, entityId, locale, isLoggedIn } = opts;

  if (!isLoggedIn) {
    if (entityType === "CATALOG_PRODUCT") {
      return toggleLocalProductFavorite(entityId);
    }
    return toggleLocalContentFavorite(entityId);
  }

  const isProduct = entityType === "CATALOG_PRODUCT";
  const currentlySaved = isProduct
    ? isInLocalProductFavorites(entityId)
    : isInLocalContentFavorites(entityId);

  const res = await fetch("/api/account/favorites", {
    method: currentlySaved ? "DELETE" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType, entityId, locale }),
  });

  if (!res.ok) {
    throw new Error("Failed to update favorite");
  }

  if (isProduct) {
    toggleLocalProductFavorite(entityId);
  } else {
    toggleLocalContentFavorite(entityId);
  }

  return !currentlySaved;
}

export async function syncFavoritesFromServer(): Promise<void> {
  try {
    const res = await fetch("/api/account/favorites");
    if (!res.ok) return;
    const data = (await res.json()) as {
      favorites?: { entityType: FavoriteEntityType; entityId: string }[];
    };
    const products: string[] = [];
    const content: string[] = [];
    for (const f of data.favorites ?? []) {
      if (f.entityType === "CATALOG_PRODUCT") products.push(f.entityId);
      else content.push(f.entityId);
    }
    writeList(PRODUCT_KEY, [...new Set([...getLocalProductFavorites(), ...products])]);
    writeList(CONTENT_KEY, [...new Set([...getLocalContentFavorites(), ...content])]);
  } catch {
    /* ignore */
  }
}
