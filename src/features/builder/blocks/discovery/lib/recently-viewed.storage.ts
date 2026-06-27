"use client";

import type { SearchEntityType } from "@prisma/client";
import type { RecentlyViewedEntry } from "./recently-viewed.types";

const STORAGE_PREFIX = "azura:recently-viewed";
const DEFAULT_LIMIT = 30;

function storageKey(locale: string): string {
  return `${STORAGE_PREFIX}:${locale}`;
}

function storageAvailable(): boolean {
  return typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined";
}

function readEntries(key: string): RecentlyViewedEntry[] {
  if (!storageAvailable()) return [];
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentlyViewedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(key: string, entries: RecentlyViewedEntry[]): void {
  if (!storageAvailable()) return;
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

export function getRecentlyViewed(
  locale: string,
  limit = DEFAULT_LIMIT,
  entityTypes?: SearchEntityType[]
): RecentlyViewedEntry[] {
  const entries = readEntries(storageKey(locale));
  const filtered = entityTypes?.length
    ? entries.filter((e) => entityTypes.includes(e.entityType))
    : entries;
  return filtered.slice(0, limit);
}

export function pushRecentlyViewed(
  locale: string,
  entry: Omit<RecentlyViewedEntry, "viewedAt">,
  options?: { maxItems?: number }
): void {
  const max = options?.maxItems ?? DEFAULT_LIMIT;
  const key = storageKey(locale);
  const entries = readEntries(key).filter(
    (e) => !(e.entityType === entry.entityType && e.entityId === entry.entityId)
  );
  entries.unshift({ ...entry, viewedAt: Date.now() });
  writeEntries(key, entries.slice(0, max));
}

export function clearRecentlyViewed(locale: string): void {
  if (!storageAvailable()) return;
  globalThis.localStorage.removeItem(storageKey(locale));
}

export function removeRecentlyViewedEntry(
  locale: string,
  entityType: SearchEntityType,
  entityId: string
): void {
  const key = storageKey(locale);
  writeEntries(
    key,
    readEntries(key).filter((e) => !(e.entityType === entityType && e.entityId === entityId))
  );
}
