import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  migrateProductDocumentForProductActions,
  migrateSiteSettingsForProductActions,
} from "../migrate-product-action-buttons";
import { resolveProductPageDisplay } from "../product-page-display";

describe("migrate-product-action-buttons", () => {
  it("migrates legacy site addToCart display to buyNow", () => {
    const result = migrateSiteSettingsForProductActions({
      productPageDisplay: { addToCart: { enabled: false } },
      productPageAddToCart: {
        enabled: true,
        label: "Shop",
        href: "https://shop.example.com/products/",
      },
    });
    assert.equal(result.changed, true);
    assert.ok(result.settings.productBuyNow);
    assert.equal("productPageAddToCart" in result.settings, false);
    const display = result.settings.productPageDisplay as Record<string, unknown>;
    assert.ok(display.buyNow);
    assert.equal("addToCart" in display, false);
  });

  it("migrates product page_display addToCart", () => {
    const result = migrateProductDocumentForProductActions({
      page_display: { addToCart: { enabled: false, inherit: true } },
      add_to_cart: { enabled: true },
    });
    assert.equal(result.changed, true);
    const pd = result.product.page_display as Record<string, unknown>;
    assert.ok(pd.buyNow);
    assert.equal("addToCart" in pd, false);
    assert.equal("add_to_cart" in result.product, false);
  });

  it("resolveProductPageDisplay reads legacy addToCart for buyNow", () => {
    const display = resolveProductPageDisplay({ addToCart: { enabled: false } }, undefined);
    assert.equal(display.buyNow.enabled, false);
  });
});
