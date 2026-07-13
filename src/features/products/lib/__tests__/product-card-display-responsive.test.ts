import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCardDisplayByViewport,
  resolveCardDisplayForViewport,
} from "@/features/products/lib/product-card-display";
import { defaultProductCardTheme } from "@/features/products/lib/product-card-theme";

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

describe("defaultProductCardTheme elementsRules", () => {
  it("includes responsive element rules for card theme", () => {
    const theme = defaultProductCardTheme();
    assert.ok(theme.elementsRules.desktop);
    assert.ok(theme.elementsRules.tablet);
    assert.ok(theme.elementsRules.mobile);
  });
});
