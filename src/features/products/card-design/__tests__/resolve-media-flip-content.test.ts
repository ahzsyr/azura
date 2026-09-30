import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMediaFlipContent } from "@/features/products/card-design/resolve-media-flip-content";
import type { ProductListingRecord } from "@/features/products/listing/types";

function baseProduct(
  overrides: Partial<ProductListingRecord> & { description?: string | null } = {},
): ProductListingRecord & { description?: string | null } {
  return {
    slug: "test-product",
    id: "1",
    name: "UniFi Switch Enterprise Campus",
    brand: "Ubiquiti",
    category: "Network Switches",
    categories: ["Enterprise", "Campus"],
    tags: ["High-performance switching", "Layer 3 networking", "Centralized management", "Scalable deployment", "Extra tag"],
    short_description: "High-performance enterprise switching for scalable networks.",
    environment: "Enterprise",
    price: { amount: 0, currency: "USD" },
    priceMin: 0,
    priceMax: 0,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: [],
    searchText: "",
    ...overrides,
  };
}

describe("resolveMediaFlipContent", () => {
  it("maps full product fields to front and back content", () => {
    const content = resolveMediaFlipContent(baseProduct());

    assert.equal(content.front.brand, "Ubiquiti");
    assert.equal(content.front.title, "UniFi Switch Enterprise Campus");
    assert.equal(
      content.front.description,
      "High-performance enterprise switching for scalable networks.",
    );
    assert.equal(content.back.category, "Network Switches");
    assert.equal(content.back.productType, "UniFi Switch Enterprise Campus");
    assert.deepEqual(content.back.benefits, [
      "High-performance switching",
      "Layer 3 networking",
      "Centralized management",
      "Scalable deployment",
    ]);
    assert.deepEqual(content.back.idealFor, ["Enterprise", "Campus"]);
  });

  it("falls back front brand to empty string", () => {
    const content = resolveMediaFlipContent(baseProduct({ brand: undefined }));
    assert.equal(content.front.brand, "");
  });

  it("falls back front title to Product when name is missing", () => {
    const content = resolveMediaFlipContent(baseProduct({ name: "" }));
    assert.equal(content.front.title, "Product");
    assert.equal(content.back.productType, "Product");
  });

  it("falls back description from long description when short is absent", () => {
    const content = resolveMediaFlipContent(
      baseProduct({
        short_description: undefined,
        description: "Long form product description.",
      }),
    );
    assert.equal(content.front.description, "Long form product description.");
  });

  it("falls back description to empty string when both descriptions are absent", () => {
    const content = resolveMediaFlipContent(
      baseProduct({ short_description: undefined, description: undefined }),
    );
    assert.equal(content.front.description, "");
  });

  it("falls back category to first categories entry", () => {
    const content = resolveMediaFlipContent(
      baseProduct({ category: null, categories: ["WAN Routers", "SMB"] }),
    );
    assert.equal(content.back.category, "WAN Routers");
  });

  it("falls back category to empty string when unavailable", () => {
    const content = resolveMediaFlipContent(
      baseProduct({ category: null, categories: [] }),
    );
    assert.equal(content.back.category, "");
  });

  it("limits benefits to four tags", () => {
    const content = resolveMediaFlipContent(baseProduct());
    assert.equal(content.back.benefits.length, 4);
    assert.ok(!content.back.benefits.includes("Extra tag"));
  });

  it("deduplicates idealFor values case-insensitively", () => {
    const content = resolveMediaFlipContent(
      baseProduct({
        environment: "Enterprise",
        categories: ["enterprise", "Campus", "Enterprise"],
      }),
    );
    assert.deepEqual(content.back.idealFor, ["Enterprise", "Campus"]);
  });

  it("omits empty idealFor segments", () => {
    const content = resolveMediaFlipContent(
      baseProduct({ environment: undefined, categories: ["", "  ", "SMB"] }),
    );
    assert.deepEqual(content.back.idealFor, ["SMB"]);
  });
});
