/**
 * Unified mobile/tablet block ordering for the product detail page stack renderer.
 */

import type { ProductPageMainOrderKey } from "@/features/products/lib/product-page-display";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import { isProductPageDeferredBlock } from "@/features/products/lib/product-page-block-registry";

export const PRODUCT_PAGE_STACK_KEYS = [
  "gallery",
  "sideBuyBox",
  "tabs",
  "frequentlyBought",
  "crossLinks",
  "promo",
  "servicesBar",
  "trust",
] as const;

export type ProductPageStackKey = (typeof PRODUCT_PAGE_STACK_KEYS)[number];

export const DEFAULT_MOBILE_STACK_ORDER: ProductPageStackKey[] = [
  "gallery",
  "sideBuyBox",
  "tabs",
  "frequentlyBought",
  "crossLinks",
  "promo",
  "servicesBar",
  "trust",
];

const MAIN_TO_STACK: Partial<Record<ProductPageMainOrderKey, ProductPageStackKey>> = {
  gallery: "gallery",
  tabs: "tabs",
  frequentlyBought: "frequentlyBought",
  crossLinks: "crossLinks",
  promo: "promo",
  servicesBar: "servicesBar",
  trust: "trust",
};

function isStackKey(v: string): v is ProductPageStackKey {
  return (PRODUCT_PAGE_STACK_KEYS as readonly string[]).includes(v);
}

function dedupe(keys: ProductPageStackKey[]): ProductPageStackKey[] {
  const seen = new Set<ProductPageStackKey>();
  const out: ProductPageStackKey[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  for (const key of PRODUCT_PAGE_STACK_KEYS) {
    if (!seen.has(key)) out.push(key);
  }
  return out;
}

/** Build stack order from layout config, main column order, and media position. */
export function resolveProductPageStackOrder(input: {
  layout: ResolvedProductPageLayout;
  mainOrder: ProductPageMainOrderKey[];
  stackOrderOverride?: string[] | null;
}): ProductPageStackKey[] {
  const override =
    input.stackOrderOverride ??
    (input.layout.mobileStackOrder.length ? input.layout.mobileStackOrder : null);

  if (override?.length) {
    return dedupe(override.filter(isStackKey));
  }

  let order: ProductPageStackKey[];
  {
    const fromMain: ProductPageStackKey[] = [];
    let sideInserted = false;
    for (const key of input.mainOrder) {
      if (key === "gallery") {
        fromMain.push("gallery");
        continue;
      }
      if (key === "tabs") {
        if (!sideInserted) {
          fromMain.push("sideBuyBox");
          sideInserted = true;
        }
        fromMain.push("tabs");
        continue;
      }
      if (isProductPageDeferredBlock(key)) {
        if (!sideInserted) {
          fromMain.push("sideBuyBox");
          sideInserted = true;
        }
        fromMain.push(key as ProductPageStackKey);
      }
    }
    if (!sideInserted) fromMain.splice(1, 0, "sideBuyBox");
    order = dedupe(fromMain.length ? fromMain : [...DEFAULT_MOBILE_STACK_ORDER]);
  }

  if (input.layout.mediaPosition === "end") {
    const galleryIdx = order.indexOf("gallery");
    const sideIdx = order.indexOf("sideBuyBox");
    if (galleryIdx >= 0 && sideIdx >= 0 && galleryIdx < sideIdx) {
      const next = [...order];
      next[galleryIdx] = "sideBuyBox";
      next[sideIdx] = "gallery";
      order = next;
    }
  }

  if (input.layout.mobileGalleryFirst === false && input.layout.mediaPosition !== "end") {
    const galleryIdx = order.indexOf("gallery");
    const sideIdx = order.indexOf("sideBuyBox");
    if (galleryIdx >= 0 && sideIdx >= 0 && galleryIdx < sideIdx) {
      const next = [...order];
      next[galleryIdx] = "sideBuyBox";
      next[sideIdx] = "gallery";
      order = next;
    }
  }

  return order;
}

export function mainKeyToStackKey(key: ProductPageMainOrderKey): ProductPageStackKey | null {
  return MAIN_TO_STACK[key] ?? null;
}
