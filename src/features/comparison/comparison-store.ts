"use client";

import { resolveCompareContentTypeSlug } from "@/features/comparison/comparison-route-resolver";
import type { ToggleCompareResult } from "@/features/comparison/types";

const STORAGE_KEY = "az_catalog_compare";
export const COMPARE_CHANGED_EVENT = "az:catalog-compare-changed";

export type CompareStoreMap = Record<string, string[]>;

function canonicalSlug(contentTypeSlug: string): string {
  return resolveCompareContentTypeSlug(contentTypeSlug);
}

export function normalizeStoreMap(map: CompareStoreMap): CompareStoreMap {
  const out: CompareStoreMap = {};
  for (const [key, ids] of Object.entries(map)) {
    const slug = canonicalSlug(key);
    const merged = out[slug] ?? [];
    const seen = new Set(merged);
    for (const id of ids) {
      if (!seen.has(id)) {
        merged.push(id);
        seen.add(id);
      }
    }
    if (merged.length > 0) out[slug] = merged;
  }
  return out;
}

function storeNeedsNormalization(raw: CompareStoreMap, normalized: CompareStoreMap): boolean {
  const rawKeys = Object.keys(raw).sort();
  const normKeys = Object.keys(normalized).sort();
  if (rawKeys.length !== normKeys.length) return true;
  for (let i = 0; i < rawKeys.length; i++) {
    if (rawKeys[i] !== normKeys[i]) return true;
    if (JSON.stringify(raw[rawKeys[i]]) !== JSON.stringify(normalized[normKeys[i]])) return true;
  }
  return false;
}

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
    const normalized = normalizeStoreMap(out);
    if (storeNeedsNormalization(out, normalized)) {
      writeStore(normalized);
    }
    return normalized;
  } catch {
    return {};
  }
}

function writeStore(map: CompareStoreMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeStoreMap(map)));
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
  return readStore()[canonicalSlug(contentTypeSlug)] ?? [];
}

export function isInCompareList(contentTypeSlug: string, itemId: string): boolean {
  return getCompareIdsForType(contentTypeSlug).includes(itemId);
}

export function removeFromCompareList(contentTypeSlug: string, itemId: string): void {
  const slug = canonicalSlug(contentTypeSlug);
  const map = readStore();
  const list = map[slug] ?? [];
  if (!list.includes(itemId)) return;
  map[slug] = list.filter((id) => id !== itemId);
  if (map[slug].length === 0) delete map[slug];
  writeStore(map);
  notify();
}

export function clearCompareList(contentTypeSlug?: string): void {
  if (contentTypeSlug) {
    const slug = canonicalSlug(contentTypeSlug);
    const map = readStore();
    delete map[slug];
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
  const slug = canonicalSlug(contentTypeSlug);
  const map = readStore();
  const list = map[slug] ?? [];
  const has = list.includes(itemId);

  if (has) {
    map[slug] = list.filter((id) => id !== itemId);
    if (map[slug].length === 0) delete map[slug];
    writeStore(map);
    notify();
    return "removed";
  }

  if (list.length >= maxItems) return "full";

  map[slug] = [...list, itemId];
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
