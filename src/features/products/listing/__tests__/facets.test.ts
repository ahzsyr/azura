import assert from "node:assert/strict";
import test from "node:test";

import { aggregateListingFacets } from "../facets/facet-engine";
import { aggregateFacets } from "../aggregate-facets";
import { createListingIndexFromRecords } from "../indexes/listing-index";
import type { ListingFilterState, ProductListingRecord } from "../types";
import type { Collection } from "@/features/collections/types";

function record(slug: string, overrides: Partial<ProductListingRecord> = {}): ProductListingRecord {
  return {
    slug,
    id: slug,
    name: slug,
    brand: "Cisco",
    category: "Networking",
    categories: ["Networking"],
    tags: ["sale"],
    price: { value: 100, currency: "USD" },
    priceMin: 100,
    priceMax: 100,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: ["networking"],
    searchText: slug,
    ...overrides,
  };
}

const taxonomy = [
  {
    slug: "networking",
    name: "Networking",
    visible: true,
  },
] as Collection[];

const records = [
  record("a", { brand: "Cisco", tags: ["sale"] }),
  record("b", { brand: "Juniper", tags: ["sale"] }),
  record("c", { brand: "Cisco", tags: ["new"] }),
];

const state: ListingFilterState = {
  q: "",
  categories: [],
  brands: ["Cisco"],
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

test("self_inclusive facet strategy matches aggregateFacets", () => {
  const matched = records.filter((r) => r.brand === "Cisco");
  const listingIndex = createListingIndexFromRecords(records);
  const viaEngine = aggregateListingFacets({
    state,
    records,
    taxonomy,
    matchedRecords: matched,
    listingIndex,
    strategy: "self_inclusive",
  });
  const legacy = aggregateFacets(matched, taxonomy);
  assert.deepEqual(viaEngine.brands, legacy.brands);
  assert.deepEqual(viaEngine.tags, legacy.tags);
});

test("self_excluding keeps other brand counts visible", () => {
  const matched = records.filter((r) => r.brand === "Cisco");
  const listingIndex = createListingIndexFromRecords(records);
  const viaEngine = aggregateListingFacets({
    state,
    records,
    taxonomy,
    matchedRecords: matched,
    listingIndex,
    strategy: "self_excluding",
  });
  const brands = Object.fromEntries(viaEngine.brands.map((b) => [b.value.toLowerCase(), b.count]));
  assert.ok((brands.cisco ?? 0) >= 1);
  assert.ok((brands.juniper ?? 0) >= 1, "self-excluding should keep Juniper countable");
});
