import { z } from "zod";
import type { RuleGroup } from "@/features/categories/matching";
import type { CatalogNavigation, CatalogNavigationItem } from "./types";
import { normalizeNavFilters } from "./normalize-nav-filters";

export const catalogNavigationTargetTypeSchema = z.enum([
  "CATEGORY",
  "BRAND",
  "PRODUCT",
  "PAGE",
  "URL",
]);

export const catalogNavigationScopeTypeSchema = z.enum([
  "GLOBAL",
  "CATEGORY",
  "BRAND",
  "PAGE",
]);

export const catalogNavigationModeSchema = z.enum(["INHERIT", "EXTEND", "REPLACE"]);

export const catalogNavigationIconTypeSchema = z.enum(["lucide", "image"]);

export const catalogNavigationSurfaceSchema = z.enum([
  "products",
  "productDetail",
  "categories",
  "categoryDetail",
  "brands",
  "brandDetail",
]);

export const catalogNavigationActionTypeSchema = z.enum([
  "PAGE_LINK",
  "CATEGORY_FILTER",
  "BRAND_FILTER",
  "ATTRIBUTE_FILTER",
  "SPEC_FILTER",
  "MULTI_FILTER",
  "SEARCH",
  "CUSTOM_URL",
]);

/** Accepts Matching Rules RuleGroup or legacy flat nav filters; normalizes to RuleGroup. */
export const catalogNavigationItemFiltersSchema = z
  .any()
  .transform((raw) => normalizeNavFilters(raw)) as unknown as z.ZodType<RuleGroup>;

export const catalogNavigationAppearanceSchema = z.object({
  theme: z.enum(["inherit", "custom"]).optional(),
  appearanceStyle: z.enum(["minimal", "pills", "elevated", "underline", "custom"]).optional(),
  background: z.string().optional(),
  foreground: z.string().optional(),
  activeBackground: z.string().optional(),
  activeForeground: z.string().optional(),
  hoverBackground: z.string().optional(),
  hoverForeground: z.string().optional(),
  border: z.string().optional(),
  borderRadius: z.string().optional(),
  shadow: z.string().optional(),
});

export const catalogNavigationLayoutSchema = z.object({
  containerWidth: z.string().optional(),
  containerHeight: z.string().optional(),
  containerMaxWidth: z.string().optional(),
  containerMinHeight: z.string().optional(),
  paddingX: z.string().optional(),
  paddingY: z.string().optional(),
  gap: z.string().optional(),
  itemWidth: z.string().optional(),
  itemHeight: z.string().optional(),
  itemPadding: z.string().optional(),
  itemMargin: z.string().optional(),
  iconSize: z.string().optional(),
  iconContainerSize: z.string().optional(),
  labelSize: z.string().optional(),
  iconLabelGap: z.string().optional(),
  displayMode: z.enum(["icon-text", "icon", "text", "auto"]).optional(),
  iconPosition: z.enum(["left", "right", "top", "bottom"]).optional(),
  horizontalAlignment: z.enum(["start", "center", "end", "space-between"]).optional(),
  verticalAlignment: z.enum(["start", "center", "end"]).optional(),
  labelAlignment: z.enum(["left", "center", "right"]).optional(),
  iconContainerStyle: z.enum(["none", "circle", "rounded", "square"]).optional(),
  showIcons: z.boolean().optional(),
  showTooltip: z.boolean().optional(),
  horizontalScroll: z.boolean().optional(),
});

export const catalogNavigationBreakpointLayoutSchema = catalogNavigationLayoutSchema;

export const catalogNavigationResponsiveSchema = z.object({
  desktop: catalogNavigationBreakpointLayoutSchema.optional(),
  tablet: catalogNavigationBreakpointLayoutSchema.optional(),
  mobile: catalogNavigationBreakpointLayoutSchema.optional(),
});

export const catalogNavigationItemSchema: z.ZodType<CatalogNavigationItem> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    icon: z.string().optional(),
    iconType: catalogNavigationIconTypeSchema.optional(),
    targetType: catalogNavigationTargetTypeSchema,
    targetId: z.string().optional(),
    url: z.string().optional(),
    badge: z.string().optional(),
    sortOrder: z.number().int(),
    visible: z.boolean(),
    openInNewTab: z.boolean().optional(),
    children: z.array(catalogNavigationItemSchema).optional(),
    actionType: catalogNavigationActionTypeSchema.optional(),
    filters: catalogNavigationItemFiltersSchema.optional(),
    searchQuery: z.string().optional(),
    tooltip: z.string().optional(),
  }),
);

export const catalogNavigationSchema: z.ZodType<CatalogNavigation> = z.object({
  id: z.string().min(1),
  scopeType: catalogNavigationScopeTypeSchema,
  scopeId: z.string().nullable(),
  mode: catalogNavigationModeSchema,
  items: z.array(catalogNavigationItemSchema),
  name: z.string().optional(),
  appearance: catalogNavigationAppearanceSchema.optional(),
  layout: catalogNavigationLayoutSchema.optional(),
  responsive: catalogNavigationResponsiveSchema.optional(),
  enabled: z.boolean().optional(),
  surfaces: z.record(catalogNavigationSurfaceSchema, z.boolean()).optional(),
});

export const catalogNavigationStoreSchema = z.object({
  navigations: z.array(catalogNavigationSchema),
});

export type CatalogNavigationStore = z.infer<typeof catalogNavigationStoreSchema>;
