import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER,
  DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY,
} from "@/features/products/listing/product-listing-filter-keys";
import {
  resolveProductListingFilters,
  resolveProductListingFiltersFromSite,
} from "@/features/products/listing/resolve-product-listing-filters";

describe("resolveProductListingFilters", () => {
  it("returns defaults when raw is missing", () => {
    const resolved = resolveProductListingFilters(undefined);
    assert.equal(resolved.showSidebar, true);
    assert.deepEqual(resolved.visibility, DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY);
    assert.deepEqual(resolved.displayOrder, DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER);
  });

  it("defaults showSidebar to true when omitted", () => {
    const resolved = resolveProductListingFilters({
      visibility: { price: false },
      displayOrder: ["price"],
    });
    assert.equal(resolved.showSidebar, true);
  });

  it("respects showSidebar false", () => {
    const resolved = resolveProductListingFilters({
      showSidebar: false,
      visibility: {},
      displayOrder: [],
    });
    assert.equal(resolved.showSidebar, false);
  });

  it("fills missing visibility keys from defaults", () => {
    const resolved = resolveProductListingFilters({
      visibility: { price: false },
      displayOrder: ["price", "brand"],
    });
    assert.equal(resolved.visibility.price, false);
    assert.equal(resolved.visibility.brand, true);
    assert.equal(resolved.visibility.category, true);
    assert.ok(resolved.displayOrder.includes("category"));
  });

  it("drops legacy collections section from saved settings", () => {
    const resolved = resolveProductListingFilters({
      visibility: { collections: true, category: true },
      displayOrder: ["collections", "category", "brand"],
    });
    assert.equal(
      (resolved.displayOrder as string[]).includes("collections"),
      false,
    );
    assert.equal(resolved.displayOrder[0], "category");
    assert.equal(resolved.visibility.category, true);
  });

  it("removes unknown displayOrder ids and appends missing ids", () => {
    const resolved = resolveProductListingFilters({
      visibility: {},
      displayOrder: ["brand", "not-a-section", "price", "brand"],
    });
    assert.equal(resolved.displayOrder[0], "brand");
    assert.equal(resolved.displayOrder[1], "price");
    assert.ok(!resolved.displayOrder.includes("not-a-section"));
    assert.equal(resolved.displayOrder.length, DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER.length);
    for (const id of DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER) {
      assert.ok(resolved.displayOrder.includes(id));
    }
  });

  it("resolves from site settings payload", () => {
    const resolved = resolveProductListingFiltersFromSite({
      productListingFilters: {
        visibility: { availability: false },
        displayOrder: ["availability", "price"],
      },
    });
    assert.equal(resolved.visibility.availability, false);
    assert.equal(resolved.displayOrder[0], "availability");
    assert.equal(resolved.displayOrder[1], "price");
  });
});
