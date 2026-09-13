import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_RESOLVED_PRODUCT_BUY_NOW } from "@/features/products/lib/product-buy-now";
import { DEFAULT_RESOLVED_PRODUCT_CTA } from "@/features/products/lib/product-cta";
import { resolveProductCardFields } from "../product-card-fields";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { resolveProductCardDesign } from "@/features/products/card-design/resolve-product-card-design";
import { resolveProductCardLayout } from "@/features/products/lib/product-storefront-layout";

const product: ProductListingRecord = {
  slug: "widget",
  id: "1",
  name: "Widget",
  categories: [],
  tags: [],
  price: { value: 10, currency: "USD" },
  priceMin: 10,
  priceMax: 10,
  in_stock: true,
  conditions: [],
  variationFacets: {},
  collectionSlugs: [],
  searchText: "widget",
  buy_now_slug: "external-widget-slug",
};

describe("resolveProductCardFields buy_now_slug", () => {
  it("uses buy_now_slug in buyNowHref", () => {
    const design = resolveProductCardDesign({ partial: {} });
    const cardLayout = resolveProductCardLayout(undefined);
    const cardDisplay = {
      showPrice: true,
      showRating: false,
      showStock: false,
      showCompare: false,
      showBrand: false,
      showShortDescription: false,
      showDiscountBadge: false,
      showBuyNow: true,
      showProductCta: false,
      showWishlist: false,
      showQuickView: false,
      showLinkedTags: false,
    };
    const buyNow = {
      ...DEFAULT_RESOLVED_PRODUCT_BUY_NOW,
      shopBaseUrl: "https://shop.example.com",
      slugPathPrefix: "/p/",
    };
    const vm = resolveProductCardFields({
      entityId: "1",
      product,
      href: "/products/widget",
      numberLocale: "en-US",
      localePrefix: "en",
      priority: false,
      cardLayout,
      cardDisplay,
      design,
      buyNow,
      productCta: DEFAULT_RESOLVED_PRODUCT_CTA,
      cardVariant: "default",
      layoutTokens: {},
      designDataAttrs: {},
    });
    assert.equal(vm.buyNowHref, "https://shop.example.com/p/external-widget-slug");
  });
});
