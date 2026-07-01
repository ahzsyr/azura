import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvertedFacetIndex,
  filterRecordsBySlugSet,
  matchListingFacetSlugs,
} from "@/features/products/index/inverted-facet-index";
import type { IndexedProductListingRecord } from "@/features/products/index/product-index-types";
import type { ListingFilterState } from "@/features/products/listing/types";

function record(slug: string, overrides: Partial<IndexedProductListingRecord>): IndexedProductListingRecord {
  return {
    slug,
    id: slug,
    name: slug,
    brand: "Cisco",
    category: "Networking",
    categories: ["Networking"],
    tags: [],
    price: { value: 100, currency: "USD" },
    priceMin: 100,
    priceMax: 100,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: [],
    searchText: slug,
    ...overrides,
  };
}

const defaultState: ListingFilterState = {
  q: "",
  categories: [],
  brands: [],
  collections: [],
  collectionScope: null,
  tags: [],
  conditions: [],
  variations: {},
  priceMin: null,
  priceMax: null,
  stockOnly: false,
  page: 1,
  per: 20,
};

test("matchListingFacetSlugs intersects active facet dimensions", () => {
  const records = [
    record("switch-1", { brand: "Cisco", tags: ["sale"], collectionSlugs: ["networking"] }),
    record("switch-2", { brand: "Cisco", tags: ["new"], collectionSlugs: ["networking"] }),
    record("router-1", { brand: "Juniper", tags: ["sale"], collectionSlugs: ["routing"] }),
  ];
  const index = buildInvertedFacetIndex("en-us", records);
  const match = matchListingFacetSlugs(index, {
    ...defaultState,
    brands: ["Cisco"],
    tags: ["sale"],
    collections: ["networking"],
  });

  assert.deepEqual(Array.from(match.slugs ?? []), ["switch-1"]);
  assert.deepEqual(match.reasonKeys, ["brand", "collection", "tag"]);
  assert.deepEqual(filterRecordsBySlugSet(records, match.slugs).map((item) => item.slug), ["switch-1"]);
});
