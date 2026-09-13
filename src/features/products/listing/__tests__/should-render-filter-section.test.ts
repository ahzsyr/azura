import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ListingFacets } from "@/features/products/listing/types";
import { DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY } from "@/features/products/listing/product-listing-filter-keys";
import {
  shouldRenderSection,
  type ShouldRenderFilterSectionContext,
} from "@/features/products/listing/should-render-filter-section";

function emptyFacets(): ListingFacets {
  return {
    collections: [],
    categories: [],
    brands: [],
    tags: [],
    conditions: [],
    variations: {},
    priceMin: 0,
    priceMax: 100,
    currency: "USD",
  };
}

function opt(value: string) {
  return { value, label: value, count: 1 };
}

function ctx(
  overrides: Partial<ShouldRenderFilterSectionContext> & {
    facets?: ListingFacets;
  } = {},
): ShouldRenderFilterSectionContext {
  return {
    visibility: { ...DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY },
    facets: emptyFacets(),
    hasSpecificationOptions: false,
    ...overrides,
  };
}

describe("shouldRenderSection", () => {
  it("never renders a disabled section", () => {
    const base = ctx({
      facets: {
        ...emptyFacets(),
        categories: [opt("Routers")],
        brands: [opt("Acme")],
        tags: [opt("sale")],
        conditions: [opt("new")],
      },
      hasSpecificationOptions: true,
      visibility: {
        ...DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY,
        category: false,
        brand: false,
        tags: false,
        specifications: false,
        condition: false,
        price: false,
        availability: false,
      },
    });
    assert.equal(shouldRenderSection("category", base), false);
    assert.equal(shouldRenderSection("brand", base), false);
    assert.equal(shouldRenderSection("tags", base), false);
    assert.equal(shouldRenderSection("specifications", base), false);
    assert.equal(shouldRenderSection("condition", base), false);
    assert.equal(shouldRenderSection("price", base), false);
    assert.equal(shouldRenderSection("availability", base), false);
  });

  it("renders price and availability when enabled regardless of facet options", () => {
    const base = ctx({ facets: emptyFacets() });
    assert.equal(shouldRenderSection("price", base), true);
    assert.equal(shouldRenderSection("availability", base), true);
  });

  it("requires options for category, brand, tags, condition", () => {
    const empty = ctx();
    assert.equal(shouldRenderSection("category", empty), false);
    assert.equal(shouldRenderSection("brand", empty), false);
    assert.equal(shouldRenderSection("tags", empty), false);
    assert.equal(shouldRenderSection("condition", empty), false);

    const filled = ctx({
      facets: {
        ...emptyFacets(),
        categories: [opt("Routers")],
        brands: [opt("Acme")],
        tags: [opt("sale")],
        conditions: [opt("new")],
      },
    });
    assert.equal(shouldRenderSection("category", filled), true);
    assert.equal(shouldRenderSection("brand", filled), true);
    assert.equal(shouldRenderSection("tags", filled), true);
    assert.equal(shouldRenderSection("condition", filled), true);
  });

  it("requires specification options for specifications section", () => {
    assert.equal(shouldRenderSection("specifications", ctx({ hasSpecificationOptions: false })), false);
    assert.equal(shouldRenderSection("specifications", ctx({ hasSpecificationOptions: true })), true);
  });
});
