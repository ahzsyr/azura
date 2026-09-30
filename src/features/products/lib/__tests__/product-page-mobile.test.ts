import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveProductPageStackOrder } from "@/features/products/lib/product-page-stack-order";
import { resolveProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import {
  resolveProductPageOverflow,
  resolveOverflowFlagsForBlock,
} from "@/features/products/lib/product-page-overflow";
import { PRODUCT_PAGE_MAIN_ORDER_KEYS } from "@/features/products/lib/product-page-display";
import {
  buildProductPageSettingsFromSite,
  serializeProductPageElementsResponsiveForSite,
} from "@/features/products/lib/product-page-responsive";
import {
  resolveProductPageDisplay,
  type ProductPageDisplayPartial,
} from "@/features/products/lib/product-page-display";
import {
  getProductPageBlockDefinition,
  isProductPageDeferredBlock,
} from "@/features/products/lib/product-page-block-registry";

describe("resolveProductPageStackOrder", () => {
  const baseLayout = resolveProductPageLayout();

  it("defaults to gallery before buy box", () => {
    const order = resolveProductPageStackOrder({
      layout: baseLayout,
      mainOrder: [...PRODUCT_PAGE_MAIN_ORDER_KEYS],
    });
    assert.ok(order.indexOf("gallery") < order.indexOf("sideBuyBox"));
    assert.ok(order.indexOf("sideBuyBox") < order.indexOf("tabs"));
  });

  it("moves gallery after buy box when mediaPosition is end", () => {
    const order = resolveProductPageStackOrder({
      layout: resolveProductPageLayout({ mediaPosition: "end" }),
      mainOrder: [...PRODUCT_PAGE_MAIN_ORDER_KEYS],
    });
    assert.ok(order.indexOf("sideBuyBox") < order.indexOf("gallery"));
  });

  it("respects explicit mobileStackOrder override", () => {
    const order = resolveProductPageStackOrder({
      layout: resolveProductPageLayout({
        mobileStackOrder: ["tabs", "gallery", "sideBuyBox"],
      }),
      mainOrder: [...PRODUCT_PAGE_MAIN_ORDER_KEYS],
    });
    assert.deepEqual(order.slice(0, 3), ["tabs", "gallery", "sideBuyBox"]);
  });

  it("places deferred blocks after core sections", () => {
    const order = resolveProductPageStackOrder({
      layout: baseLayout,
      mainOrder: [...PRODUCT_PAGE_MAIN_ORDER_KEYS],
    });
    const tabsIdx = order.indexOf("tabs");
    const servicesIdx = order.indexOf("servicesBar");
    assert.ok(tabsIdx >= 0 && servicesIdx > tabsIdx);
  });
});

describe("resolveProductPageOverflow", () => {
  it("applies defaults per block and viewport", () => {
    const resolved = resolveProductPageOverflow(null);
    assert.equal(resolved.linkedTags.mobile, "collapse");
    assert.equal(resolved.linkedTags.tablet, "slider");
    assert.equal(resolved.servicesBar.mobile, "grid");
  });

  it("merges partial overrides", () => {
    const resolved = resolveProductPageOverflow({
      linkedTags: { mobile: "slider" },
    });
    assert.equal(resolved.linkedTags.mobile, "slider");
    assert.equal(resolved.linkedTags.desktop, "grid");
  });

  it("maps to ResponsiveOverflowLayout flags", () => {
    const resolved = resolveProductPageOverflow(null);
    const flags = resolveOverflowFlagsForBlock(resolved, "crossLinks");
    assert.equal(flags.mobile.effectiveMode, "collapse");
    assert.equal(flags.mobile.collapseVariant, "accordion");
    assert.equal(flags.desktop.effectiveMode, "grid");
  });

  it("uses lower showMoreLimit for linkedTags on mobile", () => {
    const resolved = resolveProductPageOverflow(null);
    const flags = resolveOverflowFlagsForBlock(resolved, "linkedTags");
    assert.equal(flags.mobile.showMoreLimit, 4);
    assert.equal(flags.tablet.showMoreLimit, 6);
    assert.equal(flags.desktop.showMoreLimit, 6);
  });
});

describe("product page responsive element settings", () => {
  it("keeps a mobile-only price override separate from desktop", () => {
    const settings = buildProductPageSettingsFromSite({
      productPageElementsResponsive: {
        mobile: {
          display: {
            price: { enabled: false },
          },
        },
      },
    });

    assert.equal(settings.elementsRules.desktop.display.price.enabled, true);
    assert.equal(settings.elementsRules.tablet.display.price.enabled, true);
    assert.equal(settings.elementsRules.mobile.display.price.enabled, false);
  });

  it("does not let responsive overrides re-enable desktop-disabled elements", () => {
    const settings = buildProductPageSettingsFromSite({
      productPageDisplay: {
        price: { enabled: false },
        stock: { enabled: false },
      },
      productPageElementsResponsive: {
        tablet: {
          display: {
            price: { enabled: true },
          },
        },
        mobile: {
          display: {
            price: { enabled: true },
            stock: { enabled: true },
          },
        },
      },
    });

    assert.equal(settings.elementsRules.desktop.display.price.enabled, false);
    assert.equal(settings.elementsRules.tablet.display.price.enabled, false);
    assert.equal(settings.elementsRules.mobile.display.price.enabled, false);
    assert.equal(settings.elementsRules.mobile.display.stock.enabled, false);
  });

  it("serializes inherited responsive element settings as no responsive patch", () => {
    const settings = buildProductPageSettingsFromSite({});

    assert.equal(serializeProductPageElementsResponsiveForSite(settings.elementsRules), undefined);
  });

  it("treats cleared responsive element settings as inherited from desktop", () => {
    const settings = buildProductPageSettingsFromSite({
      productPageDisplay: {
        price: { enabled: true },
      },
      productPageElementsResponsive: null,
    });

    assert.equal(settings.elementsRules.desktop.display.price.enabled, true);
    assert.equal(settings.elementsRules.mobile.display.price.enabled, true);
  });

  it("adapts legacy element rules into a canonical mobile layout contract", () => {
    const settings = buildProductPageSettingsFromSite({
      productPageElementsResponsive: {
        mobile: {
          display: {
            price: { enabled: false },
            frequentlyBought: { enabled: false },
          },
          elementOrder: {
            main: ["gallery", "frequentlyBought", "tabs"],
            side: ["price", "stock"],
          },
        },
      },
    });

    const mobile = settings.resolvedLayouts.mobile;
    assert.equal(mobile.viewport, "mobile");
    assert.ok(mobile.orderedBlocks.indexOf("gallery") < mobile.orderedBlocks.indexOf("tabs"));
    assert.ok(mobile.hiddenBlocks.includes("price"));
    assert.ok(mobile.hiddenBlocks.includes("frequentlyBought"));
    assert.ok(!mobile.visibleBlocks.includes("price"));
    assert.ok(!mobile.deferredBlocks.includes("frequentlyBought"));
  });

  it("lets canonical layout config override legacy block order and hidden blocks", () => {
    const settings = buildProductPageSettingsFromSite({
      productPageLayoutConfig: {
        mobile: ["price", "gallery", "tabs"],
        hidden: {
          mobile: ["stock"],
        },
      },
    });

    const mobile = settings.resolvedLayouts.mobile;
    assert.deepEqual(mobile.orderedBlocks.slice(0, 3), ["price", "gallery", "tabs"]);
    assert.ok(mobile.hiddenBlocks.includes("stock"));
    assert.ok(!mobile.visibleBlocks.includes("stock"));
  });
});

describe("resolveProductPageDisplay", () => {
  it("applies per-product enabled overrides without inherit:false", () => {
    const display = resolveProductPageDisplay(
      {},
      { buyNow: { enabled: false } } satisfies ProductPageDisplayPartial,
    );
    assert.equal(display.buyNow.enabled, false);
  });

  it("keeps global buyNow disabled when legacy addToCart is disabled", () => {
    const display = resolveProductPageDisplay({
      addToCart: { enabled: false },
    } as ProductPageDisplayPartial);
    assert.equal(display.buyNow.enabled, false);
  });

  it("inherits global buyNow when product override sets inherit:true", () => {
    const display = resolveProductPageDisplay(
      { buyNow: { enabled: false } },
      { buyNow: { enabled: true, inherit: true } },
    );
    assert.equal(display.buyNow.enabled, false);
  });
});

describe("product page block registry", () => {
  it("defines placement and deferred behavior for product blocks", () => {
    assert.equal(getProductPageBlockDefinition("price").defaultPlacement, "sidebar");
    assert.equal(getProductPageBlockDefinition("promo").defaultPlacement, "fullWidth");
    assert.equal(isProductPageDeferredBlock("frequentlyBought"), true);
    assert.equal(isProductPageDeferredBlock("price"), false);
  });
});
