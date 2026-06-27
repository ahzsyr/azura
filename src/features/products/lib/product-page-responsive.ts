import {
  PRODUCT_PAGE_MAIN_ORDER_KEYS,
  PRODUCT_PAGE_SIDE_ORDER_KEYS,
  resolveProductPageDisplay,
  resolveProductPageElementOrder,
  serializeProductPageDisplayForSite,
  syncBuyNowAddToCartDisplay,
  type ProductPageDisplayPartial,
  type ProductPageElementOrderPartial,
  type ProductPageMainOrderKey,
  type ProductPageSideOrderKey,
  type ResolvedProductPageDisplay,
  type ResolvedProductPageElementOrder,
} from "@/features/products/lib/product-page-display";
import {
  normalizeProductPageCompactDisplayPartial,
  resolveProductPageCompactDisplay,
  serializeProductPageCompactDisplayForSite,
  type ProductPageCompactDisplayPartial,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";
import {
  normalizeProductPageLayoutPartial,
  resolveProductPageLayout,
  serializeProductPageLayoutForSite,
  type ProductPageLayoutPartial,
  type ResolvedProductPageLayout,
} from "@/features/products/lib/product-storefront-layout";
import {
  normalizeProductPageOverflowPartial,
  resolveProductPageOverflow,
  serializeProductPageOverflowForSite,
  type ProductPageOverflowPartial,
  type ResolvedProductPageOverflow,
} from "@/features/products/lib/product-page-overflow";
import type { ProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";

export type { ProductPageViewport };

export type ProductPageBlock =
  | ProductPageMainOrderKey
  | ProductPageSideOrderKey
  | "sideBuyBox";

export type ProductPageLayoutConfig = {
  desktop: ProductPageBlock[];
  tablet: ProductPageBlock[];
  mobile: ProductPageBlock[];
  hidden: Record<ProductPageViewport, ProductPageBlock[]>;
};

export type ResolvedProductLayout = {
  viewport: ProductPageViewport;
  visibleBlocks: ProductPageBlock[];
  hiddenBlocks: ProductPageBlock[];
  orderedBlocks: ProductPageBlock[];
  deferredBlocks: ProductPageBlock[];
};

export interface ProductPageLayoutResponsivePartial {
  tablet?: ProductPageLayoutPartial;
  mobile?: ProductPageLayoutPartial;
}

export interface ProductPageElementsLayerPartial {
  display?: ProductPageDisplayPartial;
  elementOrder?: ProductPageElementOrderPartial;
  compactDisplay?: ProductPageCompactDisplayPartial;
}

export interface ProductPageElementsResponsivePartial {
  tablet?: ProductPageElementsLayerPartial;
  mobile?: ProductPageElementsLayerPartial;
}

export interface ResolvedProductPageElementsLayer {
  display: ResolvedProductPageDisplay;
  elementOrder: ResolvedProductPageElementOrder;
  compactDisplay: ResolvedProductPageCompactDisplay;
}

export interface ProductPageLayoutRules {
  desktop: ResolvedProductPageLayout;
  tablet: ResolvedProductPageLayout;
  mobile: ResolvedProductPageLayout;
}

export interface ProductPageElementsRules {
  desktop: ResolvedProductPageElementsLayer;
  tablet: ResolvedProductPageElementsLayer;
  mobile: ResolvedProductPageElementsLayer;
}

export interface ProductPageSettingsFromSite {
  layoutRules: ProductPageLayoutRules;
  elementsRules: ProductPageElementsRules;
  overflow: ResolvedProductPageOverflow;
  layoutConfig: ProductPageLayoutConfig;
  resolvedLayouts: Record<ProductPageViewport, ResolvedProductLayout>;
}

const DISPLAY_DIFF_KEYS = [
  "breadcrumb",
  "gallery",
  "sideBuyBox",
  "compare",
  "saveToList",
  "price",
  "stock",
  "condition",
  "delivery",
  "quantity",
  "addToCart",
  "buyNow",
  "keySpecs",
  "inlineCta",
  "variations",
  "linkedTags",
  "shortDescription",
  "tabs",
  "tabDescription",
  "tabSpecs",
  "tabDocuments",
  "tabShipping",
  "tabReviews",
  "frequentlyBought",
  "crossLinks",
  "promo",
  "servicesBar",
  "trust",
  "floatingCta",
] as const satisfies readonly (keyof ResolvedProductPageDisplay)[];

const VIEWPORTS = ["desktop", "tablet", "mobile"] as const satisfies readonly ProductPageViewport[];

const PRODUCT_PAGE_BLOCK_KEYS = [
  ...PRODUCT_PAGE_MAIN_ORDER_KEYS,
  "sideBuyBox",
  ...PRODUCT_PAGE_SIDE_ORDER_KEYS,
] as const satisfies readonly ProductPageBlock[];

const PRODUCT_PAGE_DEFERRED_BLOCKS = new Set<ProductPageBlock>([
  "frequentlyBought",
  "crossLinks",
  "promo",
  "servicesBar",
  "trust",
]);

function isProductPageBlock(value: unknown): value is ProductPageBlock {
  return typeof value === "string" && (PRODUCT_PAGE_BLOCK_KEYS as readonly string[]).includes(value);
}

function uniqueProductBlocks(values: readonly unknown[]): ProductPageBlock[] {
  const seen = new Set<ProductPageBlock>();
  const out: ProductPageBlock[] = [];
  for (const value of values) {
    if (!isProductPageBlock(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function viewportOrderFromLayer(layer: ResolvedProductPageElementsLayer): ProductPageBlock[] {
  return uniqueProductBlocks([
    ...layer.elementOrder.main,
    "sideBuyBox",
    ...layer.elementOrder.side,
  ]);
}

function hiddenBlocksFromLayer(layer: ResolvedProductPageElementsLayer): ProductPageBlock[] {
  return PRODUCT_PAGE_BLOCK_KEYS.filter((key) => layer.display[key]?.enabled === false);
}

function normalizeViewportBlockList(raw: unknown): ProductPageBlock[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const blocks = uniqueProductBlocks(raw);
  return blocks.length ? blocks : undefined;
}

function completeViewportOrder(raw: ProductPageBlock[] | undefined): ProductPageBlock[] {
  const blocks = uniqueProductBlocks(raw ?? []);
  const seen = new Set(blocks);
  for (const key of PRODUCT_PAGE_BLOCK_KEYS) {
    if (!seen.has(key)) blocks.push(key);
  }
  return blocks;
}

export function normalizeProductPageLayoutConfigPartial(
  raw: unknown,
): Partial<ProductPageLayoutConfig> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: Partial<ProductPageLayoutConfig> = {};
  for (const viewport of VIEWPORTS) {
    const blocks = normalizeViewportBlockList(o[viewport]);
    if (blocks) out[viewport] = blocks;
  }
  const hiddenRaw = o.hidden;
  if (hiddenRaw && typeof hiddenRaw === "object" && !Array.isArray(hiddenRaw)) {
    const hiddenObj = hiddenRaw as Record<string, unknown>;
    const hidden: Partial<Record<ProductPageViewport, ProductPageBlock[]>> = {};
    for (const viewport of VIEWPORTS) {
      hidden[viewport] = normalizeViewportBlockList(hiddenObj[viewport]) ?? [];
    }
    out.hidden = hidden as Record<ProductPageViewport, ProductPageBlock[]>;
  }
  return Object.keys(out).length ? out : undefined;
}

export function buildProductPageLayoutConfigFromElementsRules(
  rules: ProductPageElementsRules,
  canonical?: Partial<ProductPageLayoutConfig> | null,
): ProductPageLayoutConfig {
  return {
    desktop: completeViewportOrder(canonical?.desktop ?? viewportOrderFromLayer(rules.desktop)),
    tablet: completeViewportOrder(canonical?.tablet ?? viewportOrderFromLayer(rules.tablet)),
    mobile: completeViewportOrder(canonical?.mobile ?? viewportOrderFromLayer(rules.mobile)),
    hidden: {
      desktop: uniqueProductBlocks(canonical?.hidden?.desktop ?? hiddenBlocksFromLayer(rules.desktop)),
      tablet: uniqueProductBlocks(canonical?.hidden?.tablet ?? hiddenBlocksFromLayer(rules.tablet)),
      mobile: uniqueProductBlocks(canonical?.hidden?.mobile ?? hiddenBlocksFromLayer(rules.mobile)),
    },
  };
}

export function resolveViewportLayout(
  config: ProductPageLayoutConfig,
  viewport: ProductPageViewport,
): ResolvedProductLayout {
  const hiddenBlocks = uniqueProductBlocks(config.hidden[viewport] ?? []);
  const hidden = new Set<ProductPageBlock>(hiddenBlocks);
  const orderedBlocks = completeViewportOrder(config[viewport]);
  const visibleBlocks = orderedBlocks.filter((block) => !hidden.has(block));
  return {
    viewport,
    visibleBlocks,
    hiddenBlocks,
    orderedBlocks,
    deferredBlocks: visibleBlocks.filter((block) => PRODUCT_PAGE_DEFERRED_BLOCKS.has(block)),
  };
}

function mergeLayoutLayer(
  parent: ResolvedProductPageLayout,
  layer?: ProductPageLayoutPartial | null,
): ResolvedProductPageLayout {
  if (!layer) return { ...parent };
  return resolveProductPageLayout({ ...parent, ...layer });
}

function applyDisplayPartial(
  parent: ResolvedProductPageDisplay,
  partial?: ProductPageDisplayPartial | null,
): ResolvedProductPageDisplay {
  if (!partial) {
    const out = { ...parent };
    for (const key of DISPLAY_DIFF_KEYS) {
      out[key] = { ...parent[key] };
    }
    return syncBuyNowAddToCartDisplay(out);
  }
  const out = { ...parent };
  for (const key of DISPLAY_DIFF_KEYS) {
    const override = partial[key];
    if (override?.enabled !== undefined) {
      out[key] = { enabled: override.enabled };
    }
  }
  return syncBuyNowAddToCartDisplay(out);
}

function mergeElementsLayer(
  parent: ResolvedProductPageElementsLayer,
  layer?: ProductPageElementsLayerPartial | null,
): ResolvedProductPageElementsLayer {
  if (!layer) {
    return {
      display: applyDisplayPartial(parent.display),
      elementOrder: {
        main: [...parent.elementOrder.main],
        side: [...parent.elementOrder.side],
      },
      compactDisplay: { ...parent.compactDisplay },
    };
  }
  return {
    display: applyDisplayPartial(parent.display, layer.display),
    elementOrder: layer.elementOrder
      ? resolveProductPageElementOrder({
          main: layer.elementOrder.main ?? [...parent.elementOrder.main],
          side: layer.elementOrder.side ?? [...parent.elementOrder.side],
        })
      : {
          main: [...parent.elementOrder.main],
          side: [...parent.elementOrder.side],
        },
    compactDisplay: layer.compactDisplay
      ? resolveProductPageCompactDisplay({
          ...serializeProductPageCompactDisplayForSite(parent.compactDisplay),
          ...layer.compactDisplay,
        })
      : { ...parent.compactDisplay },
  };
}

export function normalizeProductPageLayoutResponsivePartial(
  raw: unknown,
): ProductPageLayoutResponsivePartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPageLayoutResponsivePartial = {};
  const tablet = normalizeProductPageLayoutPartial(o.tablet);
  const mobile = normalizeProductPageLayoutPartial(o.mobile);
  if (tablet) out.tablet = tablet;
  if (mobile) out.mobile = mobile;
  return Object.keys(out).length ? out : undefined;
}

export function normalizeProductPageElementsResponsivePartial(
  raw: unknown,
): ProductPageElementsResponsivePartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPageElementsResponsivePartial = {};

  for (const key of ["tablet", "mobile"] as const) {
    const layerRaw = o[key];
    if (!layerRaw || typeof layerRaw !== "object" || Array.isArray(layerRaw)) continue;
    const layerObj = layerRaw as Record<string, unknown>;
    const layer: ProductPageElementsLayerPartial = {};
    const display = layerObj.display;
    if (display && typeof display === "object" && !Array.isArray(display)) {
      layer.display = display as ProductPageDisplayPartial;
    }
    const elementOrder = layerObj.elementOrder;
    if (elementOrder && typeof elementOrder === "object" && !Array.isArray(elementOrder)) {
      layer.elementOrder = normalizeProductPageElementOrderPartial(elementOrder);
    }
    const compactDisplay = normalizeProductPageCompactDisplayPartial(layerObj.compactDisplay);
    if (compactDisplay) layer.compactDisplay = compactDisplay;
    if (Object.keys(layer).length) out[key] = layer;
  }

  return Object.keys(out).length ? out : undefined;
}

function normalizeProductPageElementOrderPartial(
  raw: unknown,
): ProductPageElementOrderPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPageElementOrderPartial = {};
  if (Array.isArray(o.main)) out.main = o.main.filter((k): k is string => typeof k === "string");
  if (Array.isArray(o.side)) out.side = o.side.filter((k): k is string => typeof k === "string");
  return Object.keys(out).length ? out : undefined;
}

export function resolveProductPageLayoutRules(
  baseLayout?: ProductPageLayoutPartial | null,
  responsive?: ProductPageLayoutResponsivePartial | null,
): ProductPageLayoutRules {
  const desktop = resolveProductPageLayout(baseLayout);
  const tablet = mergeLayoutLayer(desktop, responsive?.tablet);
  const mobile = mergeLayoutLayer(tablet, responsive?.mobile);
  return { desktop, tablet, mobile };
}

function patchLayerDisplayFloors(
  layer: ResolvedProductPageElementsLayer,
  desktopDisplay: ResolvedProductPageDisplay,
): ResolvedProductPageElementsLayer {
  const display = { ...layer.display };
  for (const key of DISPLAY_DIFF_KEYS) {
    if (!desktopDisplay[key].enabled) {
      display[key] = { enabled: false };
    }
  }
  return {
    ...layer,
    display: syncBuyNowAddToCartDisplay(display),
  };
}

/** Desktop disables are global — child viewports cannot re-enable hidden elements. */
export function enforceDesktopDisplayFloors(rules: ProductPageElementsRules): ProductPageElementsRules {
  const { desktop } = rules;
  return {
    desktop,
    tablet: patchLayerDisplayFloors(rules.tablet, desktop.display),
    mobile: patchLayerDisplayFloors(rules.mobile, desktop.display),
  };
}

export function resolveProductPageElementsRules(
  site: {
    productPageDisplay?: ProductPageDisplayPartial | null;
    productPageElementOrder?: ProductPageElementOrderPartial | null;
    productPageCompactDisplay?: ProductPageCompactDisplayPartial | null;
  },
  responsive?: ProductPageElementsResponsivePartial | null,
): ProductPageElementsRules {
  const desktop: ResolvedProductPageElementsLayer = {
    display: resolveProductPageDisplay(site.productPageDisplay),
    elementOrder: resolveProductPageElementOrder(site.productPageElementOrder),
    compactDisplay: resolveProductPageCompactDisplay(site.productPageCompactDisplay),
  };
  const tablet = mergeElementsLayer(desktop, responsive?.tablet);
  const mobile = mergeElementsLayer(tablet, responsive?.mobile);
  return enforceDesktopDisplayFloors({ desktop, tablet, mobile });
}

export function buildProductPageSettingsFromSite(
  site: Record<string, unknown>,
): ProductPageSettingsFromSite {
  const layoutRules = resolveProductPageLayoutRules(
    normalizeProductPageLayoutPartial(site.productPageLayout),
    normalizeProductPageLayoutResponsivePartial(site.productPageLayoutResponsive),
  );
  const elementsRules = resolveProductPageElementsRules(
    {
      productPageDisplay: site.productPageDisplay as ProductPageDisplayPartial | undefined,
      productPageElementOrder: site.productPageElementOrder as ProductPageElementOrderPartial | undefined,
      productPageCompactDisplay: site.productPageCompactDisplay as ProductPageCompactDisplayPartial | undefined,
    },
    normalizeProductPageElementsResponsivePartial(site.productPageElementsResponsive),
  );
  const overflow = resolveProductPageOverflow(
    normalizeProductPageOverflowPartial(site.productPageOverflow),
  );
  const layoutConfig = buildProductPageLayoutConfigFromElementsRules(
    elementsRules,
    normalizeProductPageLayoutConfigPartial(site.productPageLayoutConfig),
  );
  const resolvedLayouts = {
    desktop: resolveViewportLayout(layoutConfig, "desktop"),
    tablet: resolveViewportLayout(layoutConfig, "tablet"),
    mobile: resolveViewportLayout(layoutConfig, "mobile"),
  };
  return { layoutRules, elementsRules, overflow, layoutConfig, resolvedLayouts };
}

function diffLayoutPartial(
  child: ResolvedProductPageLayout,
  parent: ResolvedProductPageLayout,
): ProductPageLayoutPartial {
  const out: ProductPageLayoutPartial = {};
  const keys: (keyof ProductPageLayoutPartial)[] = [
    "galleryLayout",
    "mediaPosition",
    "stickyBuyBox",
    "stickyBreadcrumb",
    "fixedBuyColumn",
    "breadcrumbStickyTop",
    "buyBoxStickyTop",
    "heroGap",
    "sectionGap",
    "borderRadius",
    "surfaceStyle",
    "tabsMode",
    "mobileGalleryFirst",
    "tabletColumnMode",
    "galleryMobileLayout",
    "galleryThumbPlacement",
    "mobileStackOrder",
    "inheritThemePreset",
    "titleFontSize",
    "bodyFontSize",
    "animationEntrance",
    "animationDurationMs",
  ];
  for (const key of keys) {
    if (child[key] !== parent[key]) {
      (out as Record<string, unknown>)[key] = child[key];
    }
  }
  return out;
}

function diffDisplayPartial(
  child: ResolvedProductPageDisplay,
  parent: ResolvedProductPageDisplay,
): ProductPageDisplayPartial | undefined {
  const out: ProductPageDisplayPartial = {};
  for (const key of DISPLAY_DIFF_KEYS) {
    if (child[key].enabled !== parent[key].enabled) {
      out[key] = { enabled: child[key].enabled };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function diffElementOrderPartial(
  child: ResolvedProductPageElementOrder,
  parent: ResolvedProductPageElementOrder,
): ProductPageElementOrderPartial | undefined {
  const out: ProductPageElementOrderPartial = {};
  if (JSON.stringify(child.main) !== JSON.stringify(parent.main)) {
    out.main = [...child.main];
  }
  if (JSON.stringify(child.side) !== JSON.stringify(parent.side)) {
    out.side = [...child.side];
  }
  return Object.keys(out).length ? out : undefined;
}

function diffElementsLayerPartial(
  child: ResolvedProductPageElementsLayer,
  parent: ResolvedProductPageElementsLayer,
): ProductPageElementsLayerPartial | undefined {
  const out: ProductPageElementsLayerPartial = {};
  const display = diffDisplayPartial(child.display, parent.display);
  if (display) out.display = display;
  const elementOrder = diffElementOrderPartial(child.elementOrder, parent.elementOrder);
  if (elementOrder) out.elementOrder = elementOrder;
  const compactSerialized = serializeProductPageCompactDisplayForSite(child.compactDisplay);
  const parentCompactSerialized = serializeProductPageCompactDisplayForSite(parent.compactDisplay);
  if (JSON.stringify(compactSerialized) !== JSON.stringify(parentCompactSerialized)) {
    out.compactDisplay = compactSerialized;
  }
  return Object.keys(out).length ? out : undefined;
}

export function serializeProductPageLayoutResponsiveForSite(
  rules: ProductPageLayoutRules,
): ProductPageLayoutResponsivePartial | undefined {
  const tablet = diffLayoutPartial(rules.tablet, rules.desktop);
  const mobile = diffLayoutPartial(rules.mobile, rules.tablet);
  const out: ProductPageLayoutResponsivePartial = {};
  if (Object.keys(tablet).length) out.tablet = tablet;
  if (Object.keys(mobile).length) out.mobile = mobile;
  return Object.keys(out).length ? out : undefined;
}

export function serializeProductPageElementsResponsiveForSite(
  rules: ProductPageElementsRules,
): ProductPageElementsResponsivePartial | undefined {
  const tablet = diffElementsLayerPartial(rules.tablet, rules.desktop);
  const mobile = diffElementsLayerPartial(rules.mobile, rules.tablet);
  const out: ProductPageElementsResponsivePartial = {};
  if (tablet) out.tablet = tablet;
  if (mobile) out.mobile = mobile;
  return Object.keys(out).length ? out : undefined;
}

export function serializeProductPageElementsDesktopForSite(
  layer: ResolvedProductPageElementsLayer,
): {
  productPageDisplay: ProductPageDisplayPartial;
  productPageElementOrder: ResolvedProductPageElementOrder;
  productPageCompactDisplay: ProductPageCompactDisplayPartial;
} {
  return {
    productPageDisplay: serializeProductPageDisplayForSite(layer.display),
    productPageElementOrder: layer.elementOrder,
    productPageCompactDisplay: serializeProductPageCompactDisplayForSite(layer.compactDisplay),
  };
}

export function serializeProductPageLayoutDesktopForSite(
  layout: ResolvedProductPageLayout,
): ProductPageLayoutPartial {
  return serializeProductPageLayoutForSite(layout);
}

export { serializeProductPageOverflowForSite, type ProductPageOverflowPartial };

export function resolveElementsLayerForViewport(
  rules: ProductPageElementsRules,
  viewport: ProductPageViewport,
): ResolvedProductPageElementsLayer {
  return rules[viewport];
}

export function resolveLayoutForViewport(
  rules: ProductPageLayoutRules,
  viewport: ProductPageViewport,
): ResolvedProductPageLayout {
  return rules[viewport];
}
