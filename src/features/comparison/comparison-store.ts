"use client";

import type { ToggleCompareResult } from "@/features/comparison/types";

const STORAGE_KEY = "az_catalog_compare";
export const COMPARE_CHANGED_EVENT = "az:catalog-compare-changed";

export type CompareStoreMap = Record<string, string[]>;

function readStore(): CompareStoreMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: CompareStoreMap = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) {
        out[key] = val.filter((id): id is string => typeof id === "string" && id.length > 0);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeStore(map: CompareStoreMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGED_EVENT));
  document.documentElement.dataset.catalogCompareCount = String(
    Object.values(readStore()).reduce((n, ids) => n + ids.length, 0)
  );
}

export function getCompareStore(): CompareStoreMap {
  return readStore();
}

export function getCompareIdsForType(contentTypeSlug: string): string[] {
  return readStore()[contentTypeSlug] ?? [];
}

export function isInCompareList(contentTypeSlug: string, itemId: string): boolean {
  return getCompareIdsForType(contentTypeSlug).includes(itemId);
}

export function removeFromCompareList(contentTypeSlug: string, itemId: string): void {
  const map = readStore();
  const list = map[contentTypeSlug] ?? [];
  if (!list.includes(itemId)) return;
  map[contentTypeSlug] = list.filter((id) => id !== itemId);
  if (map[contentTypeSlug].length === 0) delete map[contentTypeSlug];
  writeStore(map);
  notify();
}

export function clearCompareList(contentTypeSlug?: string): void {
  if (contentTypeSlug) {
    const map = readStore();
    delete map[contentTypeSlug];
    writeStore(map);
  } else {
    writeStore({});
  }
  notify();
}

export function toggleCompareList(
  contentTypeSlug: string,
  itemId: string,
  maxItems: number
): ToggleCompareResult {
  const map = readStore();
  const list = map[contentTypeSlug] ?? [];
  const has = list.includes(itemId);

  if (has) {
    map[contentTypeSlug] = list.filter((id) => id !== itemId);
    if (map[contentTypeSlug].length === 0) delete map[contentTypeSlug];
    writeStore(map);
    notify();
    return "removed";
  }

  if (list.length >= maxItems) return "full";

  map[contentTypeSlug] = [...list, itemId];
  writeStore(map);
  notify();
  return "added";
}

export function getCompareBucketsSummary(): { contentTypeSlug: string; count: number }[] {
  const map = readStore();
  return Object.entries(map)
    .filter(([, ids]) => ids.length > 0)
    .map(([contentTypeSlug, ids]) => ({ contentTypeSlug, count: ids.length }));
}
