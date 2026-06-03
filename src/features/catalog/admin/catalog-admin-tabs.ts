import type { SettingsRibbonTab } from "@/components/admin/layout/admin-settings-layout";

export const ADMIN_PRODUCT_TABS = [
  { id: "table", label: "Products table" },
  { id: "cta", label: "Storefront CTA" },
  { id: "page-elements", label: "Page elements" },
  { id: "page-appearance", label: "Page appearance" },
  { id: "card-appearance", label: "Card appearance" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminProductTabId = (typeof ADMIN_PRODUCT_TABS)[number]["id"];

export const ADMIN_COLLECTION_TABS = [
  { id: "collections", label: "Collections" },
  { id: "hierarchy", label: "Hierarchy" },
  { id: "sync", label: "Sync" },
  { id: "orphans", label: "Orphans" },
  { id: "warnings", label: "Warnings" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminCollectionTabId = (typeof ADMIN_COLLECTION_TABS)[number]["id"];

export function readHashTab<T extends string>(allowed: readonly { id: T }[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const h = window.location.hash.replace(/^#\/?/, "");
  return allowed.some((t) => t.id === h) ? (h as T) : fallback;
}

export function writeHashTab(tabId: string): void {
  const nextHash = `#${tabId}`;
  if (typeof window !== "undefined" && window.location.hash !== nextHash) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${nextHash}`,
    );
  }
}
