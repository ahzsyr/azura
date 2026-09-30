import type { ComponentType } from "react";
import type { ProductPageBlock } from "@/features/products/lib/product-page-responsive";

export type ProductPageBlockPlacement = "main" | "sidebar" | "fullWidth";

export interface ProductPageBlockDefinition {
  key: ProductPageBlock;
  component?: ComponentType<unknown>;
  defaultPlacement: ProductPageBlockPlacement;
  supportsDeferred: boolean;
  supportsMobile: boolean;
  supportsTablet: boolean;
  supportsDesktop: boolean;
}

export const PRODUCT_PAGE_BLOCK_REGISTRY: Record<ProductPageBlock, ProductPageBlockDefinition> = {
  gallery: viewportBlock("gallery", "main"),
  tabs: viewportBlock("tabs", "main"),
  frequentlyBought: viewportBlock("frequentlyBought", "main", true),
  crossLinks: viewportBlock("crossLinks", "main", true),
  promo: viewportBlock("promo", "fullWidth", true),
  servicesBar: viewportBlock("servicesBar", "fullWidth", true),
  trust: viewportBlock("trust", "fullWidth", true),
  sideBuyBox: viewportBlock("sideBuyBox", "sidebar"),
  linkedTags: viewportBlock("linkedTags", "sidebar"),
  shortDescription: viewportBlock("shortDescription", "sidebar"),
  inlineCta: viewportBlock("inlineCta", "sidebar"),
  variations: viewportBlock("variations", "sidebar"),
  compare: viewportBlock("compare", "sidebar"),
  saveToList: viewportBlock("saveToList", "sidebar"),
  price: viewportBlock("price", "sidebar"),
  stock: viewportBlock("stock", "sidebar"),
  condition: viewportBlock("condition", "sidebar"),
  delivery: viewportBlock("delivery", "sidebar"),
  quantity: viewportBlock("quantity", "sidebar"),
  buyNow: viewportBlock("buyNow", "sidebar"),
  keySpecs: viewportBlock("keySpecs", "sidebar"),
};

function viewportBlock(
  key: ProductPageBlock,
  defaultPlacement: ProductPageBlockPlacement,
  supportsDeferred = false,
): ProductPageBlockDefinition {
  return {
    key,
    defaultPlacement,
    supportsDeferred,
    supportsMobile: true,
    supportsTablet: true,
    supportsDesktop: true,
  };
}

export function getProductPageBlockDefinition(
  key: ProductPageBlock,
): ProductPageBlockDefinition {
  return PRODUCT_PAGE_BLOCK_REGISTRY[key];
}

export function isProductPageDeferredBlock(key: ProductPageBlock): boolean {
  return PRODUCT_PAGE_BLOCK_REGISTRY[key]?.supportsDeferred === true;
}
