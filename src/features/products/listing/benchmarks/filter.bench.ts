/**
 * Listing filter engine benchmarks (Phase 1+ baseline).
 *
 * Run: npx tsx src/features/products/listing/benchmarks/filter.bench.ts
 *
 * Call graph: normalize → createListingQueryPlan → ListingIndex → executeListingQueryPlan
 *             → filterListingCatalog (oracle) → aggregateFacets
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { filterListingCatalog } from "../filter";
import { aggregateFacets } from "../aggregate-facets";
import { normalizeListingFilterState } from "../normalize";
import { createListingQueryPlan } from "../query-plan";
import { executeListingQueryPlan } from "../query-engine";
import { createListingIndexFromRecords } from "../indexes/listing-index";
import type { ListingFilterState, ProductListingRecord } from "../types";

function makeRecords(n: number): ProductListingRecord[] {
  const brands = ["Cisco", "Juniper", "Ubiquiti", "Fortinet", "Arista"];
  const tags = ["sale", "new", "wifi", "fiber", "poe"];
  const collections = ["networking", "routing", "wireless", "security"];
  const out: ProductListingRecord[] = [];
  for (let i = 0; i < n; i++) {
    const brand = brands[i % brands.length];
    const tag = tags[i % tags.length];
    const collection = collections[i % collections.length];
    const price = 20 + (i % 50) * 25;
    out.push({
      slug: `product-${i}`,
      id: `product-${i}`,
      name: `Product ${i} ${brand}`,
      brand,
      category: "Networking",
      categories: ["Networking"],
      tags: [tag],
      price: { value: price, currency: "USD" },
      priceMin: price,
      priceMax: price + 10,
      in_stock: i % 7 !== 0,
      conditions: i % 11 === 0 ? ["new"] : [],
      variationFacets: i % 13 === 0 ? { Storage: ["256GB", "512GB"] } : {},
      collectionSlugs: [collection],
      searchText: `product ${i} ${brand} ${tag} ${collection}`.toLowerCase(),
    });
  }
  return out;
}

const baseState: ListingFilterState = {
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

function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return Number((performance.now() - start).toFixed(3));
}

type BenchRow = {
  size: number;
  scenario: string;
  planMs: number;
  scanFilterMs: number;
  indexedFilterMs: number;
  facetMs: number;
  matched: number;
  candidates: number;
};

function runScenario(
  records: ProductListingRecord[],
  scenario: string,
  state: ListingFilterState,
): BenchRow {
  const listingIndex = createListingIndexFromRecords(records);
  let planMs = 0;
  let plan = createListingQueryPlan(state);
  planMs = timeMs(() => {
    plan = createListingQueryPlan(state);
  });

  let scanFilterMs = 0;
  let matched = 0;
  scanFilterMs = timeMs(() => {
    matched = filterListingCatalog(records, normalizeListingFilterState(state)).length;
  });

  let indexedFilterMs = 0;
  let candidates = 0;
  indexedFilterMs = timeMs(() => {
    const result = executeListingQueryPlan(records, plan, { listingIndex });
    matched = result.matchedCount;
    candidates = result.candidateCount;
  });

  let facetMs = 0;
  facetMs = timeMs(() => {
    const filtered = executeListingQueryPlan(records, plan, { listingIndex }).records;
    aggregateFacets(filtered, []);
  });

  return {
    size: records.length,
    scenario,
    planMs,
    scanFilterMs,
    indexedFilterMs,
    facetMs,
    matched,
    candidates,
  };
}

function main() {
  const sizes = [10_000, 50_000];
  // Optional larger sizes via env to keep default runs fast.
  if (process.env.LISTING_BENCH_LARGE === "1") {
    sizes.push(100_000, 250_000);
  }

  const rows: BenchRow[] = [];
  for (const size of sizes) {
    const records = makeRecords(size);
    const scenarios: Array<[string, ListingFilterState]> = [
      ["unfiltered", { ...baseState }],
      ["brand", { ...baseState, brands: ["Cisco"] }],
      ["category+brand", { ...baseState, categories: ["Networking"], brands: ["Cisco"] }],
      ["many-facets", { ...baseState, brands: ["Cisco"], tags: ["sale"], collections: ["networking"], stockOnly: true }],
      ["or-mode", { ...baseState, brands: ["Cisco"], tags: ["wifi"], logic: "or" }],
      ["search", { ...baseState, q: "product 42" }],
      ["search+facets", { ...baseState, q: "cisco", brands: ["Cisco"] }],
      ["price", { ...baseState, priceMin: 100, priceMax: 300 }],
      ["variations", { ...baseState, variations: { Storage: ["256GB"] } }],
    ];
    for (const [name, state] of scenarios) {
      rows.push(runScenario(records, name, state));
    }
  }

  console.table(rows);
  const outPath = join(
    process.cwd(),
    "src/features/products/listing/benchmarks/baseline.json",
  );
  writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2),
  );
  console.log(`Wrote ${outPath}`);
}

main();
