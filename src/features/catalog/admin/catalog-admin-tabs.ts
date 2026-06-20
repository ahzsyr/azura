import type { SettingsRibbonTab } from "@/components/admin/layout/admin-settings-layout";

export const ADMIN_PRODUCT_TABS = [
  { id: "table", label: "Products table" },
  { id: "buy-now", label: "Buy Now" },
  { id: "quote-cta", label: "Get Quote CTA" },
  { id: "page-elements", label: "Page elements" },
  { id: "page-layout", label: "Page layout" },
  { id: "card-appearance", label: "Card appearance" },
  { id: "promo-banner", label: "Promo banner" },
  { id: "trust-widget", label: "Trust widget" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminProductTabId = (typeof ADMIN_PRODUCT_TABS)[number]["id"];

const PRODUCT_TAB_HASH_ALIASES: Record<string, AdminProductTabId> = {
  cta: "buy-now",
  "page-appearance": "page-layout",
};

export const ADMIN_COLLECTION_TABS = [
  { id: "collections", label: "Collections" },
  { id: "hierarchy", label: "Hierarchy" },
  { id: "sync", label: "Sync" },
  { id: "orphans", label: "Orphans" },
  { id: "warnings", label: "Warnings" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminCollectionTabId = (typeof ADMIN_COLLECTION_TABS)[number]["id"];

export const ADMIN_TAXONOMY_TABS = [
  { id: "brandProfiles", label: "Brand profiles" },
  { id: "brands", label: "Brand list" },
  { id: "tags", label: "Tags" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminTaxonomyTabId = (typeof ADMIN_TAXONOMY_TABS)[number]["id"];

export function readHashTab<T extends string>(allowed: readonly { id: T }[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.location.hash.replace(/^#\/?/, "");
  const h = (PRODUCT_TAB_HASH_ALIASES[raw] ?? raw) as T;
  return allowed.some((t) => t.id === h) ? h : fallback;
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
