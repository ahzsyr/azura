import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeLocaleSiteSettingsWithDefault } from "@/features/catalog/site-settings-merge";
import { resolveCardDisplayForViewport } from "@/features/products/lib/product-card-display";

describe("mergeLocaleSiteSettingsWithDefault", () => {
  it("inherits default locale page element visibility for sparse locale settings", () => {
    const defaultSettings = {
      productPageDisplay: {
        price: { enabled: false },
        stock: { enabled: false },
      },
      productCardLayout: {
        showBrand: true,
      },
    };
    const localeSettings = {
      nav: { items: [] },
    };

    const merged = mergeLocaleSiteSettingsWithDefault(defaultSettings, localeSettings);
    assert.equal(resolveCardDisplayForViewport(merged, "desktop").showPrice, false);
    assert.equal(resolveCardDisplayForViewport(merged, "desktop").showStock, false);
    assert.deepEqual(merged.nav, { items: [] });
  });

  it("lets locale-specific page element overrides win over default", () => {
    const defaultSettings = {
      productPageDisplay: {
        price: { enabled: false },
      },
    };
    const localeSettings = {
      productPageDisplay: {
        price: { enabled: true },
      },
    };

    const merged = mergeLocaleSiteSettingsWithDefault(defaultSettings, localeSettings);
    assert.equal(resolveCardDisplayForViewport(merged, "desktop").showPrice, true);
  });
});
