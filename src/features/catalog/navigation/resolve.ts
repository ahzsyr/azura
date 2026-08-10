import type {
  CatalogNavigation,
  CatalogNavigationAppearance,
  CatalogNavigationItem,
  CatalogNavigationLayout,
  CatalogNavigationMode,
  CatalogNavigationResponsive,
  CatalogNavigationScopeType,
  CatalogNavigationSurface,
} from "./types";
import { DEFAULT_CATALOG_NAVIGATION_SURFACES } from "./types";

export type ResolveCatalogNavigationInput = {
  global?: CatalogNavigation | null;
  /** PAGE scope for the current surface (scopeId = surface key). */
  page?: CatalogNavigation | null;
  category?: CatalogNavigation | null;
  brand?: CatalogNavigation | null;
};

export type ResolvedCatalogNavigationPresentation = {
  appearance?: CatalogNavigationAppearance;
  layout?: CatalogNavigationLayout;
  responsive?: CatalogNavigationResponsive;
};

export type ResolvedCatalogNavigation = ResolvedCatalogNavigationPresentation & {
  items: CatalogNavigationItem[];
  /** Human-readable chain for admin, most-specific first. */
  chainLabels: string[];
};

/**
 * Whether the catalog strip should render for a storefront surface.
 * Reads only the GLOBAL CatalogNavigation document (single source of truth).
 * Unset `enabled` / surface keys default to true (backward compatible).
 */
export function isCatalogNavigationEnabledForSurface(
  global: CatalogNavigation | null | undefined,
  surface: CatalogNavigationSurface,
): boolean {
  if (!global) return true;
  if (global.enabled === false) return false;
  const flag = global.surfaces?.[surface];
  if (flag === false) return false;
  return true;
}

/**
 * Layers from least → most specific (entity wins).
 * GLOBAL → PAGE(surface) → CATEGORY → BRAND
 */
function orderedLayers(input: ResolveCatalogNavigationInput): CatalogNavigation[] {
  const layers: CatalogNavigation[] = [];
  if (input.global) layers.push(input.global);
  if (input.page) layers.push(input.page);
  if (input.category) layers.push(input.category);
  if (input.brand) layers.push(input.brand);
  return layers;
}

/**
 * Resolve effective catalog navigation items.
 * Precedence: entity → PAGE → GLOBAL (applied least→most with INHERIT/EXTEND/REPLACE).
 */
export function resolveCatalogNavigation(
  input: ResolveCatalogNavigationInput = {},
): CatalogNavigationItem[] {
  return resolveCatalogNavigationFull(input).items;
}

/** Resolve items plus merged appearance/layout/responsive and inheritance chain labels. */
export function resolveCatalogNavigationFull(
  input: ResolveCatalogNavigationInput = {},
): ResolvedCatalogNavigation {
  const layers = orderedLayers(input);
  let items: CatalogNavigationItem[] = [];
  for (const layer of layers) {
    items = applyNavigationMode(items, layer);
  }
  items = items.filter((item) => item.visible !== false).sort((a, b) => a.sortOrder - b.sortOrder);

  const presentation = resolvePresentation(layers);
  const chainLabels = buildChainLabels(input);

  return { items, ...presentation, chainLabels };
}

function resolvePresentation(layers: CatalogNavigation[]): ResolvedCatalogNavigationPresentation {
  let appearance: CatalogNavigationAppearance | undefined;
  let layout: CatalogNavigationLayout | undefined;
  let responsive: CatalogNavigationResponsive | undefined;

  for (const layer of layers) {
    if (layer.appearance) {
      appearance = { ...(appearance ?? {}), ...layer.appearance };
    }
    if (layer.layout) {
      layout = { ...(layout ?? {}), ...layer.layout };
    }
    if (layer.responsive) {
      responsive = {
        desktop: { ...(responsive?.desktop ?? {}), ...(layer.responsive.desktop ?? {}) },
        tablet: { ...(responsive?.tablet ?? {}), ...(layer.responsive.tablet ?? {}) },
        mobile: { ...(responsive?.mobile ?? {}), ...(layer.responsive.mobile ?? {}) },
      };
    }
  }

  return { appearance, layout, responsive };
}

export function buildChainLabels(input: ResolveCatalogNavigationInput): string[] {
  const labels: string[] = [];
  if (input.brand?.scopeId) labels.push(input.brand.scopeId);
  else if (input.category?.scopeId) labels.push(input.category.scopeId);
  if (input.page?.scopeId) {
    labels.push(surfaceLabel(input.page.scopeId));
  }
  if (input.global) labels.push("Global");
  return labels.length ? labels : ["Global"];
}

function surfaceLabel(scopeId: string): string {
  const map: Record<string, string> = {
    products: "Products",
    productDetail: "Product Details",
    categories: "Categories",
    categoryDetail: "Category Details",
    brands: "Brands",
    brandDetail: "Brand Details",
  };
  return map[scopeId] ?? scopeId;
}

/** Merge helper for Extend mode. */
export function mergeNavigationItems(
  base: CatalogNavigationItem[],
  extension: CatalogNavigationItem[],
): CatalogNavigationItem[] {
  const byId = new Map(base.map((item) => [item.id, item]));
  for (const item of extension) {
    byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function applyNavigationMode(
  parentItems: CatalogNavigationItem[],
  local: CatalogNavigation | null | undefined,
): CatalogNavigationItem[] {
  if (!local) return parentItems;
  const mode: CatalogNavigationMode = local.mode;
  if (mode === "REPLACE") return [...local.items].sort((a, b) => a.sortOrder - b.sortOrder);
  if (mode === "EXTEND") return mergeNavigationItems(parentItems, local.items);
  return parentItems;
}

export function emptyCatalogNavigation(
  scopeType: CatalogNavigationScopeType,
  scopeId: string | null = null,
): CatalogNavigation {
  const base: CatalogNavigation = {
    id: `nav-${scopeType.toLowerCase()}-${scopeId ?? "root"}`,
    scopeType,
    scopeId,
    mode: scopeType === "GLOBAL" ? "REPLACE" : "INHERIT",
    items: [],
    appearance: { theme: "inherit" },
  };
  if (scopeType === "GLOBAL") {
    base.enabled = true;
    base.surfaces = { ...DEFAULT_CATALOG_NAVIGATION_SURFACES };
    base.name = "Global Catalog Navigation";
  }
  return base;
}

/** Describe which configs participate in resolution for admin UI. */
export function describeNavigationInheritance(input: {
  scopeType: CatalogNavigationScopeType;
  scopeId: string | null;
  surface?: CatalogNavigationSurface | null;
}): string {
  const parts: string[] = [];
  if (input.scopeType === "BRAND" && input.scopeId) {
    parts.push(input.scopeId, "Brands", "Global");
  } else if (input.scopeType === "CATEGORY" && input.scopeId) {
    parts.push(input.scopeId, "Categories", "Global");
  } else if (input.scopeType === "PAGE" && input.scopeId) {
    parts.push(surfaceLabel(input.scopeId), "Global");
  } else {
    parts.push("Global");
  }
  return parts.join(" → ");
}
