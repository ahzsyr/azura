export type CatalogWorkspaceNavId =
  | "products"
  | "categories"
  | "brands"
  | "navigation"
  | "filters"
  | "sync"
  | "settings";

export type CatalogWorkspaceNavItem = {
  id: CatalogWorkspaceNavId;
  label: string;
  href: string;
  /** When true, surface is a Phase placeholder. */
  placeholder?: boolean;
};

export const CATALOG_WORKSPACE_NAV: readonly CatalogWorkspaceNavItem[] = [
  { id: "products", label: "Products", href: "/admin/products" },
  { id: "categories", label: "Categories", href: "/admin/categories" },
  { id: "brands", label: "Brands", href: "/admin/catalog-taxonomy" },
  { id: "navigation", label: "Listing Navigation", href: "/admin/catalog/navigation" },
  { id: "filters", label: "Filters", href: "/admin/product-listing-filters" },
  { id: "sync", label: "Sync", href: "/admin/catalog/sync" },
  { id: "settings", label: "Settings", href: "/admin/catalog/settings" },
] as const;
