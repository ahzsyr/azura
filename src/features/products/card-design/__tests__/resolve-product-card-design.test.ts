import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import {
  resolveProductCardDesign,
  serializeProductCardDesignForSite,
} from "@/features/products/card-design/resolve-product-card-design";
import { resolveProductCardBadges } from "@/features/products/card-design/resolve-product-card-badges";
import type { ProductListingRecord } from "@/features/products/listing/types";

describe("resolveProductCardDesign", () => {
  it("migrates legacy hoverBehavior into v2 design", () => {
    const legacy = resolveProductCardLayout({ hoverBehavior: "glow" });
    const design = resolveProductCardDesign({ legacyLayout: legacy });
    assert.equal(design.hoverEffect, "glow");
  });

  it("serializes minimal diff for defaults", () => {
    const design = resolveProductCardDesign({});
    const serialized = serializeProductCardDesignForSite(design);
    assert.equal(Object.keys(serialized).length, 0);
  });
});

describe("resolveProductCardBadges", () => {
  const base: ProductListingRecord = {
    slug: "x",
    id: "1",
    name: "Test",
    categories: [],
    tags: ["badge:new"],
    price: { value: 80, currency: "USD" },
    old_price: 100,
    priceMin: 80,
    priceMax: 80,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: [],
    searchText: "",
  };

  it("returns sale and new badges", () => {
    const design = resolveProductCardDesign({});
    const badges = resolveProductCardBadges(base, design, 20);
    assert.ok(badges.some((b) => b.type === "sale"));
    assert.ok(badges.some((b) => b.type === "new"));
  });
});
