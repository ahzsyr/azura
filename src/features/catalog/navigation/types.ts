/**
 * Catalog Navigation — independent from HeaderWorkspace.
 *
 * Invariant: no shared menu persistence with Header Builder.
 * Theme tokens may be shared; menu data and ownership remain separate.
 *
 * Architectural lock: the GLOBAL CatalogNavigation JsonStore document is the
 * single source of truth for `enabled` and `surfaces`. Page/entity docs own
 * their own items, appearance, layout, and filters. Precedence:
 * entity → PAGE(surface) → GLOBAL → category-root fallback.
 */

export type CatalogNavigationTargetType =
  | "CATEGORY"
  | "BRAND"
  | "PRODUCT"
  | "PAGE"
  | "URL";

export type CatalogNavigationScopeType = "GLOBAL" | "CATEGORY" | "BRAND" | "PAGE";

export type CatalogNavigationMode = "INHERIT" | "EXTEND" | "REPLACE";

export type CatalogNavigationIconType = "lucide" | "image";

export type CatalogNavigationActionType =
  | "PAGE_LINK"
  | "CATEGORY_FILTER"
  | "BRAND_FILTER"
  | "ATTRIBUTE_FILTER"
  | "SPEC_FILTER"
  | "MULTI_FILTER"
  | "SEARCH"
  | "CUSTOM_URL";

/** @deprecated Flat nav filter fields — upgraded to Matching Rules on read. */
export type CatalogNavigationFilterField =
  | "category"
  | "brand"
  | "tag"
  | "condition"
  | "collection"
  | "variation"
  | "attribute";

/** @deprecated Prefer RuleGroup.match */
export type CatalogNavigationFilterMatch = "ALL" | "ANY";

/** @deprecated Legacy flat condition — upgraded via normalizeNavFilters. */
export type CatalogNavigationFilterCondition = {
  field: CatalogNavigationFilterField;
  /** Facet value (Category name, brand display name, tag, etc.). */
  value: string;
  /** Required for `variation` / `attribute` (maps to listing `var=Type:Option`). */
  variationType?: string;
};

/**
 * Navigation item filters are Matching Rules (same engine as collections/categories).
 * Legacy `{ match: ALL|ANY, conditions: [...] }` is upgraded on read/save.
 */
export type CatalogNavigationItemFilters = import("@/features/categories/matching").RuleGroup;

export type CatalogNavigationThemeMode = "inherit" | "custom";

export type CatalogNavigationAppearanceStyle =
  | "minimal"
  | "pills"
  | "elevated"
  | "underline"
  | "custom";

export type CatalogNavigationDisplayMode = "icon-text" | "icon" | "text" | "auto";

export type CatalogNavigationIconPosition = "left" | "right" | "top" | "bottom";

export type CatalogNavigationHorizontalAlign = "start" | "center" | "end" | "space-between";

export type CatalogNavigationVerticalAlign = "start" | "center" | "end";

export type CatalogNavigationLabelAlign = "left" | "center" | "right";

export type CatalogNavigationIconContainerStyle =
  | "none"
  | "circle"
  | "rounded"
  | "square";

export type CatalogNavigationAppearance = {
  theme?: CatalogNavigationThemeMode;
  /** Visual style preset id (admin-friendly). */
  appearanceStyle?: CatalogNavigationAppearanceStyle;
  background?: string;
  foreground?: string;
  activeBackground?: string;
  activeForeground?: string;
  hoverBackground?: string;
  hoverForeground?: string;
  border?: string;
  borderRadius?: string;
  shadow?: string;
};

export type CatalogNavigationLayout = {
  containerWidth?: string;
  containerHeight?: string;
  containerMaxWidth?: string;
  containerMinHeight?: string;
  paddingX?: string;
  paddingY?: string;
  gap?: string;
  itemWidth?: string;
  itemHeight?: string;
  itemPadding?: string;
  /** Outer margin around each nav button. */
  itemMargin?: string;
  iconSize?: string;
  iconContainerSize?: string;
  labelSize?: string;
  iconLabelGap?: string;
  /** How items show icon vs label. Default `auto` ≈ icon-text. */
  displayMode?: CatalogNavigationDisplayMode;
  iconPosition?: CatalogNavigationIconPosition;
  horizontalAlignment?: CatalogNavigationHorizontalAlign;
  verticalAlignment?: CatalogNavigationVerticalAlign;
  labelAlignment?: CatalogNavigationLabelAlign;
  iconContainerStyle?: CatalogNavigationIconContainerStyle;
  /** When false with displayMode auto, prefer text-only. */
  showIcons?: boolean;
  /** Show label as title/tooltip when icon-only. Default true. */
  showTooltip?: boolean;
  /** When false, clip overflow instead of horizontal scroll. Default true. */
  horizontalScroll?: boolean;
};

export type CatalogNavigationBreakpointLayout = Partial<CatalogNavigationLayout>;

export type CatalogNavigationResponsive = {
  desktop?: CatalogNavigationBreakpointLayout;
  tablet?: CatalogNavigationBreakpointLayout;
  mobile?: CatalogNavigationBreakpointLayout;
};

/** Storefront page types that may display the catalog strip. */
export type CatalogNavigationSurface =
  | "products"
  | "productDetail"
  | "categories"
  | "categoryDetail"
  | "brands"
  | "brandDetail";

export const CATALOG_NAVIGATION_SURFACES: CatalogNavigationSurface[] = [
  "products",
  "productDetail",
  "categories",
  "categoryDetail",
  "brands",
  "brandDetail",
];

export const DEFAULT_CATALOG_NAVIGATION_SURFACES: Record<CatalogNavigationSurface, boolean> = {
  products: true,
  productDetail: true,
  categories: true,
  categoryDetail: true,
  brands: true,
  brandDetail: true,
};

export const CATALOG_NAVIGATION_ACTION_TYPES: CatalogNavigationActionType[] = [
  "PAGE_LINK",
  "CATEGORY_FILTER",
  "BRAND_FILTER",
  "ATTRIBUTE_FILTER",
  "SPEC_FILTER",
  "MULTI_FILTER",
  "SEARCH",
  "CUSTOM_URL",
];

export type CatalogNavigationItem = {
  id: string;
  label: string;
  icon?: string;
  iconType?: CatalogNavigationIconType;
  targetType: CatalogNavigationTargetType;
  targetId?: string;
  url?: string;
  badge?: string;
  sortOrder: number;
  /** When false, item stays in admin but is omitted from the storefront. */
  visible: boolean;
  openInNewTab?: boolean;
  children?: CatalogNavigationItem[];
  /** When unset, inferred from targetType / url for legacy docs. */
  actionType?: CatalogNavigationActionType;
  filters?: CatalogNavigationItemFilters;
  /** Keyword for SEARCH action → listing `?q=`. */
  searchQuery?: string;
  tooltip?: string;
};

export type CatalogNavigation = {
  id: string;
  scopeType: CatalogNavigationScopeType;
  scopeId: string | null;
  mode: CatalogNavigationMode;
  items: CatalogNavigationItem[];
  name?: string;
  appearance?: CatalogNavigationAppearance;
  layout?: CatalogNavigationLayout;
  responsive?: CatalogNavigationResponsive;
  /**
   * GLOBAL SoT: master switch for the catalog strip.
   * Default true when unset (backward compatible).
   */
  enabled?: boolean;
  /**
   * GLOBAL SoT: which storefront surfaces show the strip.
   * Missing keys default to true.
   */
  surfaces?: Partial<Record<CatalogNavigationSurface, boolean>>;
};

/** Taxonomy policy — auto-create is never available during Sync in Phase 1+. */
export type CategoryCreationPolicy = "manual_only" | "manual_plus_approved" | "automatic";

export const DEFAULT_CATEGORY_CREATION_POLICY: CategoryCreationPolicy = "manual_only";

/** Infer actionType for legacy items that predate the field. */
export function inferCatalogNavigationActionType(
  item: Pick<CatalogNavigationItem, "actionType" | "targetType" | "url" | "filters" | "targetId">,
): CatalogNavigationActionType {
  if (item.actionType) return item.actionType;
  const filters = item.filters;
  if (filters && Array.isArray(filters.children) && filters.children.length > 0) {
    const leaves = collectLeaves(filters);
    if (leaves.length > 1) return "MULTI_FILTER";
    if (leaves.length === 1) return inferFilterActionFromRuleField(leaves[0]!.field);
  }
  // Legacy flat conditions (pre-Matching-Rules)
  const legacy = filters as { conditions?: Array<{ field?: string }> } | undefined;
  if (legacy && Array.isArray(legacy.conditions) && legacy.conditions.length > 0) {
    return legacy.conditions.length > 1
      ? "MULTI_FILTER"
      : inferFilterActionFromRuleField(String(legacy.conditions[0]?.field ?? "category"));
  }
  if (item.targetType === "URL") return "CUSTOM_URL";
  if (item.url && !item.targetId) return "CUSTOM_URL";
  return "PAGE_LINK";
}

function collectLeaves(
  node: CatalogNavigationItemFilters,
): Array<{ field: string }> {
  const out: Array<{ field: string }> = [];
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const obj = n as Record<string, unknown>;
    if ("field" in obj && "operator" in obj) {
      out.push({ field: String(obj.field) });
      return;
    }
    if (Array.isArray(obj.children)) {
      for (const child of obj.children) walk(child);
    }
  };
  walk(node);
  return out;
}

function inferFilterActionFromRuleField(field: string): CatalogNavigationActionType {
  switch (field) {
    case "category":
    case "categories":
      return "CATEGORY_FILTER";
    case "brand":
      return "BRAND_FILTER";
    case "specification":
    case "variation":
      return "SPEC_FILTER";
    case "attribute":
      return "ATTRIBUTE_FILTER";
    default:
      return "MULTI_FILTER";
  }
}
