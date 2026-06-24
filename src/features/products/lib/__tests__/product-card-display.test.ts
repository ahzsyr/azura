import { describe, expect, it } from "vitest";
import {
  blockPropsToCardDisplayOverrides,
  mergeProductCardDisplayOverrides,
  nonProductEntityCardOverrides,
  resolveCardDisplayByViewport,
  resolveCardDisplayForViewport,
  resolveProductCardDisplay,
} from "@/features/products/lib/product-card-display";
import { discoveryItemToListingRecord } from "@/features/products/lib/discovery-to-listing-record";
import { defaultProductCardTheme } from "@/features/products/lib/product-card-theme";
import { SearchEntityType } from "@prisma/client";

describe("defaultProductCardTheme", () => {
  it("includes v2 design engine fields", () => {
    const theme = defaultProductCardTheme();
    expect(theme.design).toBeDefined();
    expect(theme.design.style).toBe("modern_commerce");
    expect(theme.designDataAttrs["data-prd-style"]).toBe("modern_commerce");
    expect(theme.contentOrder.length).toBeGreaterThan(0);
    expect(theme.elementsRules.desktop).toBeDefined();
    expect(theme.elementsRules.mobile).toBeDefined();
  });
});

describe("resolveProductCardDisplay", () => {
  it("derives card flags from page display and card layout", () => {
    const theme = defaultProductCardTheme();
    const display = resolveProductCardDisplay(
      { ...theme.pageDisplay, price: { enabled: false }, trust: { enabled: false } },
      { ...theme.cardLayout, showCompare: false, showBrand: false },
      theme.buyNow,
      theme.quoteCta,
    );

    expect(display.showPrice).toBe(false);
    expect(display.showRating).toBe(false);
    expect(display.showCompare).toBe(false);
    expect(display.showBrand).toBe(false);
  });

  it("derives wishlist and quick view from page display", () => {
    const theme = defaultProductCardTheme();
    const display = resolveProductCardDisplay(
      { ...theme.pageDisplay, saveToList: { enabled: false }, buyNow: { enabled: false } },
      theme.cardLayout,
      theme.buyNow,
      theme.quoteCta,
    );

    expect(display.showWishlist).toBe(false);
    expect(display.showQuickView).toBe(false);
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

    expect(resolveCardDisplayForViewport(site, "desktop").showPrice).toBe(true);
    expect(resolveCardDisplayForViewport(site, "tablet").showPrice).toBe(true);
    expect(resolveCardDisplayForViewport(site, "mobile").showPrice).toBe(false);
    expect(resolveCardDisplayForViewport(site, "mobile").showStock).toBe(false);
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

    expect(resolveCardDisplayForViewport(site, "desktop").showPrice).toBe(false);
    expect(resolveCardDisplayForViewport(site, "mobile").showPrice).toBe(false);
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
    expect(byViewport.desktop.showShortDescription).toBe(true);
    expect(byViewport.mobile.showShortDescription).toBe(false);
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
      showQuoteCta: true,
      showWishlist: true,
      showQuickView: true,
    };

    const merged = mergeProductCardDisplayOverrides(global, {
      showPrice: true,
      showRating: false,
    });

    expect(merged.showPrice).toBe(false);
    expect(merged.showRating).toBe(false);
  });
});

describe("blockPropsToCardDisplayOverrides", () => {
  it("maps false block flags to overrides", () => {
    expect(
      blockPropsToCardDisplayOverrides({
        showPrice: false,
        showCompare: false,
      }),
    ).toEqual({
      showPrice: false,
      showCompare: false,
    });
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

    expect(record.name).toBe("Hello");
    expect(record.brand).toBe("Blog");
    expect(record.short_description).toBe("Summary");
    expect(record.primary_image).toBe("/img.jpg");
  });

  it("non-product overrides hide commerce elements", () => {
    expect(nonProductEntityCardOverrides()).toMatchObject({
      showPrice: false,
      showBuyNow: false,
      showCompare: false,
    });
  });
});
