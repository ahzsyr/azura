import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Collection } from "@/features/collections/types";
import {
  aggregateFacets,
  applyCategoryVisibilityToFacets,
} from "@/features/products/listing/aggregate-facets";
import type { ListingFacets, ProductListingRecord } from "@/features/products/listing/types";
import { MOCK_LISTING_RECORD_SALE } from "@/features/products/listing/__fixtures__/mock-listing-record";

function categoryNode(overrides: Partial<Collection> & Pick<Collection, "slug" | "name">): Collection {
  return {
    id: overrides.id ?? overrides.slug,
    slug: overrides.slug,
    name: overrides.name,
    description: "",
    conditions: { kind: "group", match: "any", children: [] },
    visible: overrides.visible,
    ...overrides,
  };
}

function record(overrides: Partial<ProductListingRecord>): ProductListingRecord {
  return { ...MOCK_LISTING_RECORD_SALE, collectionSlugs: [], ...overrides };
}

describe("aggregateFacets — Category settings alignment", () => {
  const routers = categoryNode({
    id: "cat-100m",
    name: "100M Routers",
    slug: "100m-routers",
  });

  const accessPoints = categoryNode({
    id: "cat-4g-ap",
    name: "4G Access Points",
    slug: "4g-access-points",
  });

  it("hides Category facet option when Category.visible = false (name key)", () => {
    const facets = aggregateFacets(
      [record({ category: "100M Routers", categoryIds: undefined })],
      [{ ...routers, visible: false }],
    );
    assert.equal(
      facets.categories.some((c) => c.value === "100M Routers"),
      false,
    );
  });

  it("emits Category facet option when Category.visible = true (name key)", () => {
    const facets = aggregateFacets(
      [record({ category: "100M Routers", categoryIds: undefined })],
      [{ ...routers, visible: true }],
    );
    assert.equal(
      facets.categories.some((c) => c.value === "100M Routers"),
      true,
    );
  });

  it("hides Category facet option when Category.visible = false (slug key)", () => {
    const facets = aggregateFacets(
      [record({ category: "100m-routers", categoryIds: undefined })],
      [{ ...routers, visible: false }],
    );
    assert.equal(facets.categories.length, 0);
  });

  it("emits settings Category name when product uses slug key and Category.visible = true", () => {
    const facets = aggregateFacets(
      [record({ category: "100m-routers", categoryIds: undefined })],
      [{ ...routers, visible: true }],
    );
    assert.equal(
      facets.categories.some((c) => c.value === "100M Routers"),
      true,
    );
  });

  it("hides Collections facet option when Category.visible = false", () => {
    const facets = aggregateFacets(
      [record({ category: "100M Routers", collectionSlugs: ["100m-routers"] })],
      [{ ...routers, visible: false }],
    );
    assert.equal(
      facets.collections.some((c) => c.slug === "100m-routers"),
      false,
    );
  });

  it("drops orphan product.category that is not in Categories settings", () => {
    const facets = aggregateFacets(
      [record({ category: "4G Access Points", categoryIds: undefined })],
      [{ ...routers, visible: true }],
    );
    assert.equal(
      facets.categories.some((c) => c.value === "4G Access Points"),
      false,
    );
  });

  it("emits settings name when orphan-looking string matches a visible Category", () => {
    const facets = aggregateFacets(
      [record({ category: "4G Access Points", categoryIds: undefined })],
      [{ ...accessPoints, visible: true }],
    );
    assert.equal(
      facets.categories.some((c) => c.value === "4G Access Points"),
      true,
    );
  });

  it("counts via membership slug even without product.category", () => {
    const facets = aggregateFacets(
      [record({ category: null, categoryIds: undefined, collectionSlugs: ["100m-routers"] })],
      [{ ...routers, visible: true }],
    );
    assert.equal(
      facets.categories.some((c) => c.value === "100M Routers" && c.count === 1),
      true,
    );
  });

  it("matches case-insensitive / whitespace-normalized names", () => {
    const facets = aggregateFacets(
      [record({ category: "  100m  routers ", categoryIds: undefined })],
      [{ ...routers, visible: true }],
    );
    assert.equal(
      facets.categories.some((c) => c.value === "100M Routers"),
      true,
    );
  });

  it("strips hidden and orphan categories from cached facet-index payloads", () => {
    const stale: ListingFacets = {
      collections: [
        {
          slug: "100m-routers",
          value: "100m-routers",
          label: "100M Routers",
          depth: 0,
          count: 1,
        },
      ],
      categories: [
        { value: "100M Routers", label: "100M Routers", count: 1 },
        { value: "4G Access Points", label: "4G Access Points", count: 6 },
      ],
      brands: [],
      tags: [],
      conditions: [],
      variations: {},
      priceMin: 0,
      priceMax: 0,
      currency: "USD",
    };
    const filtered = applyCategoryVisibilityToFacets(stale, [{ ...routers, visible: false }]);
    assert.equal(filtered.categories.length, 0);
    assert.equal(filtered.collections.length, 0);
  });

  it("keeps visible settings Category when remapping cached facets", () => {
    const stale: ListingFacets = {
      collections: [],
      categories: [
        { value: "100m-routers", label: "100m-routers", count: 2 },
        { value: "Orphan Label", label: "Orphan Label", count: 3 },
      ],
      brands: [],
      tags: [],
      conditions: [],
      variations: {},
      priceMin: 0,
      priceMax: 0,
      currency: "USD",
    };
    const filtered = applyCategoryVisibilityToFacets(stale, [{ ...routers, visible: true }]);
    assert.deepEqual(
      filtered.categories.map((c) => c.value),
      ["100M Routers"],
    );
    assert.equal(filtered.categories[0]?.count, 2);
  });
});
