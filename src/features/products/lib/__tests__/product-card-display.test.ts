import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockPropsToCardDisplayOverrides,
  mergeProductCardDisplayOverrides,
  migrateCardVisibilityIntoPageDisplay,
  nonProductEntityCardOverrides,
  resolveCardDisplayByViewport,
  resolveCardDisplayForViewport,
  resolveProductCardDisplay,
} from "@/features/products/lib/product-card-display";
import { resolveProductPageDisplay } from "@/features/products/lib/product-page-display";
import { discoveryItemToListingRecord } from "@/features/products/lib/discovery-to-listing-record";
import { defaultProductCardTheme } from "@/features/products/lib/product-card-theme";
import { SearchEntityType } from "@prisma/client";

describe("defaultProductCardTheme", () => {
  it("includes v2 design engine fields", () => {
    const theme = defaultProductCardTheme();
    assert.ok(theme.design);
    assert.equal(theme.design.style, "modern_commerce");
    assert.equal(theme.designDataAttrs["data-prd-style"], "modern_commerce");
    assert.ok(theme.contentOrder.length > 0);
    assert.ok(theme.elementsRules.desktop);
    assert.ok(theme.elementsRules.mobile);
  });
});

describe("resolveProductCardDisplay", () => {
  it("derives card flags from page display", () => {
    const theme = defaultProductCardTheme();
    const display = resolveProductCardDisplay(
      {
        ...theme.pageDisplay,
        price: { enabled: false },
        trust: { enabled: false },
        compare: { enabled: false },
        cardBrand: { enabled: false },
      },
      theme.cardLayout,
      theme.buyNow,
      theme.productCta,
    );

    assert.equal(display.showPrice, false);
    assert.equal(display.showRating, false);
    assert.equal(display.showCompare, false);
    assert.equal(display.showBrand, false);
  });

  it("derives wishlist and quick view from page display", () => {
    const theme = defaultProductCardTheme();
    const pageDisplay = resolveProductPageDisplay({ buyNow: { enabled: false } }, undefined);
    const display = resolveProductCardDisplay(
      { ...pageDisplay, saveToList: { enabled: false } },
      theme.cardLayout,
      theme.buyNow,
      theme.productCta,
    );

    assert.equal(display.showWishlist, false);
    assert.equal(display.showQuickView, false);
  });

  it("allows quick view when explicitly enabled without buy now page element", () => {
    const theme = defaultProductCardTheme();
    const pageDisplay = resolveProductPageDisplay(
      { buyNow: { enabled: false }, quickView: { enabled: true } },
      undefined,
    );
    const display = resolveProductCardDisplay(
      pageDisplay,
      theme.cardLayout,
      theme.buyNow,
      theme.productCta,
    );
    assert.equal(display.showQuickView, true);
  });

  it("derives linked tags from page display", () => {
    const theme = defaultProductCardTheme();
    const display = resolveProductCardDisplay(
      { ...theme.pageDisplay, linkedTags: { enabled: false } },
      theme.cardLayout,
      theme.buyNow,
      theme.productCta,
    );

    assert.equal(display.showLinkedTags, false);
  });

  it("migrates legacy card layout visibility into page display keys", () => {
    const migrated = migrateCardVisibilityIntoPageDisplay({
      productCardLayout: { showBrand: false, showCompare: false, showDiscountBadge: true },
    });

    assert.equal(migrated?.cardBrand?.enabled, false);
    assert.equal(migrated?.compare?.enabled, false);
    assert.equal(migrated?.cardDiscountBadge?.enabled, true);
  });
});

describe("resolveCardDisplayForViewport", () => {
  it("applies mobile-only page element overrides to card display", () => {
    const site = {
      productPageElementsResponsive: {
        mobile: {
          display: {
            price: { enabled: false },
            stock: { enabled: false },
          },
        },
      },
    };

    assert.equal(resolveCardDisplayForViewport(site, "desktop").showPrice, true);
    assert.equal(resolveCardDisplayForViewport(site, "tablet").showPrice, true);
    assert.equal(resolveCardDisplayForViewport(site, "mobile").showPrice, false);
    assert.equal(resolveCardDisplayForViewport(site, "mobile").showStock, false);
  });

  it("keeps card price hidden on mobile when desktop disables it despite stale overrides", () => {
    const site = {
      productPageDisplay: {
        price: { enabled: false },
      },
      productPageElementsResponsive: {
        mobile: {
          display: {
            price: { enabled: true },
          },
        },
      },
    };

    assert.equal(resolveCardDisplayForViewport(site, "desktop").showPrice, false);
    assert.equal(resolveCardDisplayForViewport(site, "mobile").showPrice, false);
  });

  it("returns all viewports from resolveCardDisplayByViewport", () => {
    const site = {
      productPageElementsResponsive: {
        mobile: {
          display: {
            shortDescription: { enabled: false },
          },
        },
      },
    };

    const byViewport = resolveCardDisplayByViewport(site);
    assert.equal(byViewport.desktop.showShortDescription, true);
    assert.equal(byViewport.mobile.showShortDescription, false);
  });
});

describe("mergeProductCardDisplayOverrides", () => {
  it("allows blocks to hide but not re-enable globally disabled elements", () => {
    const global = {
      showPrice: false,
      showRating: true,
      showStock: true,
      showCompare: true,
      showBrand: true,
      showShortDescription: true,
      showDiscountBadge: true,
      showBuyNow: true,
      showProductCta: true,
      showWishlist: true,
      showQuickView: true,
      showLinkedTags: true,
    };

    const merged = mergeProductCardDisplayOverrides(global, {
      showPrice: true,
      showRating: false,
    });

    assert.equal(merged.showPrice, false);
    assert.equal(merged.showRating, false);
  });
});

describe("blockPropsToCardDisplayOverrides", () => {
  it("maps false block flags to overrides", () => {
    assert.deepEqual(
      blockPropsToCardDisplayOverrides({
        showPrice: false,
        showCompare: false,
      }),
      {
        showPrice: false,
        showCompare: false,
      },
    );
  });
});

describe("discoveryItemToListingRecord", () => {
  it("maps discovery fields onto listing record shape", () => {
    const record = discoveryItemToListingRecord({
      id: "post-1",
      entityType: SearchEntityType.POST,
      entityId: "hello-world",
      title: "Hello",
      urlPath: "/en/blog/hello-world",
      imageUrl: "/img.jpg",
      snippet: "Summary",
      badge: "Blog",
    });

    assert.equal(record.name, "Hello");
    assert.equal(record.brand, "Blog");
    assert.equal(record.short_description, "Summary");
    assert.equal(record.primary_image, "/img.jpg");
  });

  it("non-product overrides hide commerce elements", () => {
    const overrides = nonProductEntityCardOverrides();
    assert.equal(overrides.showPrice, false);
    assert.equal(overrides.showBuyNow, false);
    assert.equal(overrides.showCompare, false);
  });
});
