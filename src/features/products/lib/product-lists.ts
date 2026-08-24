/**
 * Product wishlist / compare — bridged to unified catalog ComparisonStore (slug: products).
 */
import {
  COMPARE_CHANGED_EVENT as CATALOG_COMPARE_EVENT,
  clearCompareList as clearCatalogCompare,
  getCompareIdsForType,
  isInCompareList as isInCatalogCompare,
  removeFromCompareList as removeCatalogCompare,
  toggleCompareList as toggleCatalogCompare,
} from "@/features/comparison/comparison-store";
import {
  PRODUCT_COMPARE_MAX,
  PRODUCT_COMPARE_SLUG,
} from "@/features/comparison/product-comparison.constants";

const SAVED_KEY = "az_saved";

export const MAX_COMPARE_PRODUCTS = PRODUCT_COMPARE_MAX;

export const COMPARE_CHANGED_EVENT = "az:compare-changed";

export type ToggleCompareResult = "added" | "removed" | "full";

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

function notifyCompareChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGED_EVENT));
  window.dispatchEvent(new CustomEvent(CATALOG_COMPARE_EVENT));
}

export function getCompareList(): string[] {
  return getCompareIdsForType(PRODUCT_COMPARE_SLUG);
}

export function isInCompareList(productId: string): boolean {
  return isInCatalogCompare(PRODUCT_COMPARE_SLUG, productId);
}

export function isInSavedList(productId: string): boolean {
  return readList(SAVED_KEY).includes(productId);
}

export function removeFromCompareList(productId: string): void {
  removeCatalogCompare(PRODUCT_COMPARE_SLUG, productId);
  notifyCompareChanged();
}

export function clearCompareList(): void {
  clearCatalogCompare(PRODUCT_COMPARE_SLUG);
  notifyCompareChanged();
}

export function toggleCompareList(productId: string): ToggleCompareResult {
  const result = toggleCatalogCompare(PRODUCT_COMPARE_SLUG, productId, MAX_COMPARE_PRODUCTS);
  notifyCompareChanged();
  return result;
}

export function toggleSavedList(productId: string): boolean {
  const list = readList(SAVED_KEY);
  const has = list.includes(productId);
  const next = has ? list.filter((id) => id !== productId) : [...list, productId];
  writeList(SAVED_KEY, next);
  return !has;
}
