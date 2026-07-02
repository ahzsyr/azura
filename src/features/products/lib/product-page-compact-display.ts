/**
 * Compact side-rail visibility when scrolling on desktop PDP.
 * Stored in site.json as `productPageCompactDisplay`.
 */

export const PRODUCT_PAGE_COMPACT_ELEMENT_KEYS = [
  "brand",
  "title",
  "sku",
  "ean",
  "rating",
  "linkedTags",
  "shortDescription",
  "inlineCta",
  "variations",
  "compare",
  "saveToList",
  "price",
  "stock",
  "condition",
  "delivery",
  "quantity",
  "buyNow",
  "keySpecs",
] as const;

export type ProductPageCompactElementKey = (typeof PRODUCT_PAGE_COMPACT_ELEMENT_KEYS)[number];

export interface ProductPageCompactDisplayPartial {
  enabled?: boolean;
  scrollOffsetPx?: number;
  elements?: Partial<Record<ProductPageCompactElementKey, boolean>>;
}

export interface ResolvedProductPageCompactDisplay {
  enabled: boolean;
  scrollOffsetPx: number;
  elements: Record<ProductPageCompactElementKey, boolean>;
  visibleKeys: ProductPageCompactElementKey[];
}

const COMPACT_ELEMENT_DEFAULTS: Record<ProductPageCompactElementKey, boolean> = {
  brand: true,
  title: true,
  sku: true,
  ean: true,
  rating: true,
  linkedTags: true,
  shortDescription: false,
  inlineCta: false,
  variations: false,
  compare: true,
  saveToList: true,
  price: true,
  stock: true,
  condition: false,
  delivery: false,
  quantity: false,
  buyNow: true,
  keySpecs: false,
};

const COMPACT_DISPLAY_DEFAULTS: ResolvedProductPageCompactDisplay = {
  enabled: true,
  scrollOffsetPx: 24,
  elements: { ...COMPACT_ELEMENT_DEFAULTS },
  visibleKeys: PRODUCT_PAGE_COMPACT_ELEMENT_KEYS.filter((k) => COMPACT_ELEMENT_DEFAULTS[k]),
};

export const PRODUCT_PAGE_COMPACT_ELEMENT_LABELS: Record<ProductPageCompactElementKey, string> = {
  brand: "Brand",
  title: "Product title",
  sku: "SKU / MPN",
  ean: "EAN",
  rating: "Rating & reviews link",
  linkedTags: "Collection tags",
  shortDescription: "Short description",
  inlineCta: "Inline CTA",
  variations: "Variation chips",
  compare: "Compare action",
  saveToList: "Save to list",
  price: "Price",
  stock: "Stock status",
  condition: "Condition pills",
  delivery: "Delivery options",
  quantity: "Quantity stepper",
  buyNow: "Buy Now / Shop Now",
  keySpecs: "Key specs table",
};

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

export function normalizeProductPageCompactDisplayPartial(
  raw: unknown,
): ProductPageCompactDisplayPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPageCompactDisplayPartial = {};
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (o.scrollOffsetPx != null) out.scrollOffsetPx = num(o.scrollOffsetPx, 24);
  if (o.elements && typeof o.elements === "object" && !Array.isArray(o.elements)) {
    const elements: Partial<Record<ProductPageCompactElementKey, boolean>> = {};
    for (const key of PRODUCT_PAGE_COMPACT_ELEMENT_KEYS) {
      const v = (o.elements as Record<string, unknown>)[key];
      if (typeof v === "boolean") elements[key] = v;
    }
    if (Object.keys(elements).length) out.elements = elements;
  }
  return Object.keys(out).length ? out : undefined;
}

export function resolveProductPageCompactDisplay(
  partial?: ProductPageCompactDisplayPartial | null,
): ResolvedProductPageCompactDisplay {
  const elements = { ...COMPACT_ELEMENT_DEFAULTS };
  if (partial?.elements) {
    for (const key of PRODUCT_PAGE_COMPACT_ELEMENT_KEYS) {
      if (typeof partial.elements[key] === "boolean") {
        elements[key] = partial.elements[key]!;
      }
    }
    const legacyAddToCart = (partial.elements as Record<string, unknown>).addToCart;
    if (typeof legacyAddToCart === "boolean" && typeof partial.elements.buyNow !== "boolean") {
      elements.buyNow = legacyAddToCart;
    }
  }
  elements.title = true;

  const visibleKeys = PRODUCT_PAGE_COMPACT_ELEMENT_KEYS.filter((k) => elements[k]);

  return {
    enabled: bool(partial?.enabled, COMPACT_DISPLAY_DEFAULTS.enabled),
    scrollOffsetPx: num(partial?.scrollOffsetPx, COMPACT_DISPLAY_DEFAULTS.scrollOffsetPx),
    elements,
    visibleKeys,
  };
}

export function serializeProductPageCompactDisplayForSite(
  r: ResolvedProductPageCompactDisplay,
): ProductPageCompactDisplayPartial {
  const o: ProductPageCompactDisplayPartial = {};
  if (r.enabled !== COMPACT_DISPLAY_DEFAULTS.enabled) o.enabled = r.enabled;
  if (r.scrollOffsetPx !== COMPACT_DISPLAY_DEFAULTS.scrollOffsetPx) o.scrollOffsetPx = r.scrollOffsetPx;

  const elements: Partial<Record<ProductPageCompactElementKey, boolean>> = {};
  for (const key of PRODUCT_PAGE_COMPACT_ELEMENT_KEYS) {
    if (key === "title") continue;
    if (r.elements[key] !== COMPACT_ELEMENT_DEFAULTS[key]) {
      elements[key] = r.elements[key];
    }
  }
  if (Object.keys(elements).length) o.elements = elements;
  return o;
}

export function productPageCompactDisplayDataAttrs(
  compact: ResolvedProductPageCompactDisplay,
): Record<string, string> {
  return {
    "data-prd-side-compact-enabled": compact.enabled ? "true" : "false",
    "data-prd-side-compact-offset": String(compact.scrollOffsetPx),
    "data-prd-side-compact-visible": compact.visibleKeys.join(","),
  };
}
