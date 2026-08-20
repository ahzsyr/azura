import type { SettingsRibbonTab } from "@/components/admin/layout/admin-settings-layout";

export const ADMIN_PRODUCT_TABS = [
  { id: "table", label: "Products table" },
  { id: "buy-now", label: "Buy Now" },
  { id: "cta", label: "CTA Button" },
  { id: "ordering", label: "Ordering" },
  { id: "card-appearance", label: "Product Cards" },
  { id: "promo-banner", label: "Promo banner" },
  { id: "trust-widget", label: "Trust widget" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminProductTabId = (typeof ADMIN_PRODUCT_TABS)[number]["id"];

/** Legacy Product Page hashes — redirect to Pages → Product. */
export const PRODUCT_PAGE_DESIGN_HASHES = new Set([
  "page-builder",
  "page-appearance",
  "page-layout",
  "page-elements",
  "product-page",
]);

export const PRODUCT_PAGE_DESIGN_HREF = "/admin/pages?tab=product";

const PRODUCT_TAB_HASH_ALIASES: Record<string, AdminProductTabId> = {
  "quote-cta": "cta",
  "product-cards": "card-appearance",
};

export const ADMIN_COLLECTION_TABS = [
  { id: "collections", label: "Categories" },
  { id: "hierarchy", label: "Hierarchy" },
  { id: "products", label: "Products" },
  { id: "rules", label: "Rules" },
  { id: "sync", label: "Sync" },
  { id: "issues", label: "Issues" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminCollectionTabId = (typeof ADMIN_COLLECTION_TABS)[number]["id"];

/** @deprecated alias — use ADMIN_COLLECTION_TABS */
export const ADMIN_CATEGORY_WORKSPACE_TABS = ADMIN_COLLECTION_TABS;
export type AdminCategoryWorkspaceTabId = AdminCollectionTabId;

const COLLECTION_TAB_HASH_ALIASES: Record<string, AdminCollectionTabId> = {
  orphans: "issues",
  warnings: "issues",
  unmatched: "issues",
};

export const ADMIN_TAXONOMY_TABS = [
  { id: "brands", label: "Brands" },
  { id: "tags", label: "Tags" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminTaxonomyTabId = (typeof ADMIN_TAXONOMY_TABS)[number]["id"];

const TAXONOMY_TAB_HASH_ALIASES: Record<string, AdminTaxonomyTabId> = {
  brandProfiles: "brands",
  "brand-profiles": "brands",
  "brand-list": "brands",
};

export function readHashTab<T extends string>(allowed: readonly { id: T }[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.location.hash.replace(/^#\/?/, "");
  const aliased =
    PRODUCT_TAB_HASH_ALIASES[raw] ??
    COLLECTION_TAB_HASH_ALIASES[raw] ??
    TAXONOMY_TAB_HASH_ALIASES[raw] ??
    raw;
  const h = aliased as T;
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
