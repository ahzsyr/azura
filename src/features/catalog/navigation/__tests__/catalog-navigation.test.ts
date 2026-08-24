import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyNavigationMode,
  emptyCatalogNavigation,
  resolveCatalogNavigation,
  resolveCatalogNavigationFull,
  describeNavigationInheritance,
} from "../resolve";
import { inferCatalogNavigationActionType } from "../types";
import type { CatalogNavigation, CatalogNavigationItem } from "../types";
import { filtersToListingState, listingStateFromNavFilters } from "../filters-to-listing-state";
import { buildCatalogNavItemHref, listingStateFromNavHref } from "../item-href";
import {
  catalogNavItemIsFilterActive,
  listingStateMatchesFilters,
} from "../listing-state-match";
import { filterStateFromSearchParams, searchParamsFromFilterState } from "@/features/products/listing/url-state";
import { filterListingCatalog } from "@/features/products/listing/filter";
import type { ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import { emptyListingFilterState } from "../filters-to-listing-state";

function item(
  partial: Partial<CatalogNavigationItem> & Pick<CatalogNavigationItem, "id" | "label">,
): CatalogNavigationItem {
  return {
    targetType: "CATEGORY",
    sortOrder: 0,
    visible: true,
    ...partial,
  };
}

function nav(
  partial: Partial<CatalogNavigation> &
    Pick<CatalogNavigation, "id" | "scopeType" | "mode" | "items">,
): CatalogNavigation {
  return {
    scopeId: null,
    ...partial,
  };
}

describe("resolveCatalogNavigation precedence", () => {
  it("applies GLOBAL → PAGE → entity (entity REPLACE wins)", () => {
    const global = nav({
      id: "g",
      scopeType: "GLOBAL",
      mode: "REPLACE",
      items: [item({ id: "g1", label: "Global", sortOrder: 0 })],
    });
    const page = nav({
      id: "p",
      scopeType: "PAGE",
      scopeId: "brands",
      mode: "REPLACE",
      items: [item({ id: "p1", label: "Brands page", sortOrder: 0 })],
    });
    const brand = nav({
      id: "b",
      scopeType: "BRAND",
      scopeId: "ubiquiti",
      mode: "REPLACE",
      items: [item({ id: "b1", label: "Ubiquiti", sortOrder: 0 })],
    });

    const items = resolveCatalogNavigation({ global, page, brand });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.id, "b1");
  });

  it("EXTEND merges by id after PAGE", () => {
    const global = nav({
      id: "g",
      scopeType: "GLOBAL",
      mode: "REPLACE",
      items: [
        item({ id: "a", label: "A", sortOrder: 0 }),
        item({ id: "b", label: "B", sortOrder: 1 }),
      ],
    });
    const page = nav({
      id: "p",
      scopeType: "PAGE",
      scopeId: "products",
      mode: "EXTEND",
      items: [item({ id: "c", label: "C", sortOrder: 2 })],
    });
    const items = resolveCatalogNavigation({ global, page });
    assert.deepEqual(
      items.map((i) => i.id),
      ["a", "b", "c"],
    );
  });

  it("INHERIT keeps parent items", () => {
    const global = nav({
      id: "g",
      scopeType: "GLOBAL",
      mode: "REPLACE",
      items: [item({ id: "g1", label: "Global", sortOrder: 0 })],
    });
    const page = nav({
      id: "p",
      scopeType: "PAGE",
      scopeId: "products",
      mode: "INHERIT",
      items: [item({ id: "ignored", label: "Ignored", sortOrder: 0 })],
    });
    const items = resolveCatalogNavigation({ global, page });
    assert.equal(items[0]!.id, "g1");
  });

  it("filters invisible items", () => {
    const global = nav({
      id: "g",
      scopeType: "GLOBAL",
      mode: "REPLACE",
      items: [
        item({ id: "a", label: "A", sortOrder: 0, visible: true }),
        item({ id: "b", label: "B", sortOrder: 1, visible: false }),
      ],
    });
    const items = resolveCatalogNavigation({ global });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.id, "a");
  });

  it("merges appearance from more specific layers", () => {
    const global = nav({
      id: "g",
      scopeType: "GLOBAL",
      mode: "REPLACE",
      items: [],
      appearance: { theme: "inherit", background: "red" },
      layout: { gap: "8px" },
    });
    const page = nav({
      id: "p",
      scopeType: "PAGE",
      scopeId: "products",
      mode: "INHERIT",
      items: [],
      appearance: { activeBackground: "blue" },
      layout: { iconSize: "40px" },
    });
    const full = resolveCatalogNavigationFull({ global, page });
    assert.equal(full.appearance?.background, "red");
    assert.equal(full.appearance?.activeBackground, "blue");
    assert.equal(full.layout?.gap, "8px");
    assert.equal(full.layout?.iconSize, "40px");
  });

  it("describeNavigationInheritance shows chain", () => {
    assert.equal(
      describeNavigationInheritance({ scopeType: "BRAND", scopeId: "ubiquiti" }),
      "ubiquiti → Brands → Global",
    );
    assert.equal(
      describeNavigationInheritance({ scopeType: "PAGE", scopeId: "brands" }),
      "Brands → Global",
    );
  });
});

describe("legacy actionType inference", () => {
  it("infers PAGE_LINK from targetType", () => {
    assert.equal(
      inferCatalogNavigationActionType({
        targetType: "CATEGORY",
        targetId: "wifi",
      }),
      "PAGE_LINK",
    );
  });

  it("infers CUSTOM_URL from URL target", () => {
    assert.equal(
      inferCatalogNavigationActionType({
        targetType: "URL",
        url: "https://example.com",
      }),
      "CUSTOM_URL",
    );
  });

  it("infers MULTI_FILTER from multiple conditions", () => {
    assert.equal(
      inferCatalogNavigationActionType({
        targetType: "CATEGORY",
        filters: {
          match: "ALL",
          conditions: [
            { field: "brand", value: "Ubiquiti" },
            { field: "category", value: "WiFi" },
          ],
        } as never,
      }),
      "MULTI_FILTER",
    );
  });
});

describe("filtersToListingState", () => {
  it("maps category name and brand display name", () => {
    const partial = filtersToListingState({
      match: "ALL",
      conditions: [
        { field: "category", value: "WiFi" },
        { field: "brand", value: "Ubiquiti" },
      ],
    } as never);
    assert.deepEqual(partial.categories, ["WiFi"]);
    assert.deepEqual(partial.brands, ["Ubiquiti"]);
    assert.equal(partial.logic, undefined);
  });

  it("maps Matching Rules RuleGroup leaves", () => {
    const partial = filtersToListingState({
      kind: "group",
      match: "all",
      children: [
        { kind: "leaf", field: "category", operator: "equals", value: "WiFi" },
        { kind: "leaf", field: "brand", operator: "equals", value: "Ubiquiti" },
      ],
    });
    assert.deepEqual(partial.categories, ["WiFi"]);
    assert.deepEqual(partial.brands, ["Ubiquiti"]);
  });

  it("maps variation to var Type:Option", () => {
    const partial = filtersToListingState({
      match: "ALL",
      conditions: [{ field: "variation", value: "5 GHz", variationType: "Frequency" }],
    } as never);
    assert.deepEqual(partial.variations, { Frequency: ["5 GHz"] });
  });

  it("sets logic=or for ANY match", () => {
    const partial = filtersToListingState({
      match: "ANY",
      conditions: [
        { field: "brand", value: "Ubiquiti" },
        { field: "category", value: "WiFi" },
      ],
    } as never);
    assert.equal(partial.logic, "or");
  });
});

describe("item-href + URL round-trip", () => {
  it("builds category filter URL with Category name", () => {
    const href = buildCatalogNavItemHref({
      locale: "en-us",
      listingBasePath: "/en-us/products",
      item: item({
        id: "1",
        label: "WiFi",
        actionType: "CATEGORY_FILTER",
        filters: { match: "ALL", conditions: [{ field: "category", value: "WiFi" }] },
      }),
    });
    assert.equal(href, "/en-us/products?category=WiFi");
    const state = listingStateFromNavHref(href);
    assert.deepEqual(state.categories, ["WiFi"]);
  });

  it("builds multi-filter URL", () => {
    const href = buildCatalogNavItemHref({
      locale: "en-us",
      listingBasePath: "/en-us/products",
      item: item({
        id: "1",
        label: "Ubiquiti WiFi",
        actionType: "MULTI_FILTER",
        filters: {
          match: "ALL",
          conditions: [
            { field: "brand", value: "Ubiquiti" },
            { field: "category", value: "WiFi" },
          ],
        },
      }),
    });
    assert.ok(href.includes("brand=Ubiquiti"));
    assert.ok(href.includes("category=WiFi"));
    const round = filterStateFromSearchParams(
      new URL(href, "https://x.local").searchParams,
    );
    assert.deepEqual(round.brands, ["Ubiquiti"]);
    assert.deepEqual(round.categories, ["WiFi"]);
  });

  it("builds PAGE_LINK category path", () => {
    const href = buildCatalogNavItemHref({
      locale: "en-us",
      item: item({
        id: "1",
        label: "WiFi",
        actionType: "PAGE_LINK",
        targetType: "CATEGORY",
        targetId: "wifi",
      }),
    });
    assert.equal(href, "/en-us/categories/wifi");
  });

  it("builds SEARCH URL with q keyword", () => {
    const href = buildCatalogNavItemHref({
      locale: "en-us",
      listingBasePath: "/en-us/products",
      item: item({
        id: "1",
        label: "Switch",
        actionType: "SEARCH",
        searchQuery: "switch",
      }),
    });
    assert.equal(href, "/en-us/products?q=switch");
    const state = listingStateFromNavHref(href);
    assert.equal(state.q, "switch");
  });

  it("builds SEARCH URL with exact phrase flag", () => {
    const href = buildCatalogNavItemHref({
      locale: "en-us",
      listingBasePath: "/en-us/products",
      item: item({
        id: "1",
        label: "Door Access",
        actionType: "SEARCH",
        searchQuery: "Door Access",
        searchExact: true,
      }),
    });
    assert.equal(href, "/en-us/products?q=Door+Access&q_exact=1");
    const state = listingStateFromNavHref(href);
    assert.equal(state.q, "Door Access");
    assert.equal(state.qExact, true);
  });

  it("round-trips logic=or", () => {
    const state = listingStateFromNavFilters({
      match: "ANY",
      conditions: [
        { field: "brand", value: "A" },
        { field: "category", value: "B" },
      ],
    });
    const href = searchParamsFromFilterState(state, "/en-us/products");
    assert.ok(href.includes("logic=or"));
    const parsed = filterStateFromSearchParams(new URL(href, "https://x.local").searchParams);
    assert.equal(parsed.logic, "or");
  });
});

describe("listing-state-match active state", () => {
  const base = emptyListingFilterState();

  it("matches exact category filter", () => {
    const state: ListingFilterState = { ...base, categories: ["WiFi"] };
    assert.equal(
      listingStateMatchesFilters(state, {
        match: "ALL",
        conditions: [{ field: "category", value: "WiFi" }],
      }),
      true,
    );
  });

  it("partial mismatch fails for ALL", () => {
    const state: ListingFilterState = { ...base, categories: ["WiFi"] };
    assert.equal(
      listingStateMatchesFilters(state, {
        match: "ALL",
        conditions: [
          { field: "category", value: "WiFi" },
          { field: "brand", value: "Ubiquiti" },
        ],
      }),
      false,
    );
  });

  it("matches multi-filter when all present", () => {
    const state: ListingFilterState = {
      ...base,
      categories: ["WiFi"],
      brands: ["Ubiquiti"],
    };
    assert.equal(
      listingStateMatchesFilters(state, {
        match: "ALL",
        conditions: [
          { field: "category", value: "WiFi" },
          { field: "brand", value: "Ubiquiti" },
        ],
      }),
      true,
    );
  });

  it("treats path brand as implied context", () => {
    const state = emptyListingFilterState();
    const navItem = item({
      id: "1",
      label: "All Ubiquiti",
      actionType: "BRAND_FILTER",
      filters: { match: "ALL", conditions: [{ field: "brand", value: "Ubiquiti" }] },
    });
    assert.equal(
      catalogNavItemIsFilterActive(navItem, state, { pathBrandName: "Ubiquiti" }),
      true,
    );
    assert.equal(catalogNavItemIsFilterActive(navItem, state), false);
  });

  it("matches SEARCH action when q equals keyword", () => {
    const navItem = item({
      id: "1",
      label: "Switch",
      actionType: "SEARCH",
      searchQuery: "switch",
    });
    assert.equal(
      catalogNavItemIsFilterActive(navItem, { ...base, q: "switch" }),
      true,
    );
    assert.equal(
      catalogNavItemIsFilterActive(navItem, { ...base, q: "Switch" }),
      true,
    );
    assert.equal(
      catalogNavItemIsFilterActive(navItem, { ...base, q: "router" }),
      false,
    );
  });

  it("matches SEARCH exact phrase only when q_exact is set", () => {
    const navItem = item({
      id: "1",
      label: "Door Access",
      actionType: "SEARCH",
      searchQuery: "Door Access",
      searchExact: true,
    });
    assert.equal(
      catalogNavItemIsFilterActive(navItem, { ...base, q: "Door Access", qExact: true }),
      true,
    );
    assert.equal(
      catalogNavItemIsFilterActive(navItem, { ...base, q: "Door Access" }),
      false,
    );
    assert.equal(
      catalogNavItemIsFilterActive(navItem, { ...base, q: "door access", qExact: true }),
      true,
    );
  });
});

describe("filterListingCatalog logic=or", () => {
  const records: ProductListingRecord[] = [
    {
      slug: "a",
      id: "a",
      name: "A",
      brand: "Ubiquiti",
      category: "WiFi",
      categories: ["WiFi"],
      tags: [],
      price: { amount: 1, currency: "USD" },
      priceMin: 1,
      priceMax: 1,
      in_stock: true,
      conditions: [],
      variationFacets: {},
      collectionSlugs: [],
      searchText: "a",
    },
    {
      slug: "b",
      id: "b",
      name: "B",
      brand: "MikroTik",
      category: "Switching",
      categories: ["Switching"],
      tags: [],
      price: { amount: 1, currency: "USD" },
      priceMin: 1,
      priceMax: 1,
      in_stock: true,
      conditions: [],
      variationFacets: {},
      collectionSlugs: [],
      searchText: "b",
    },
  ];

  it("keeps AND behavior by default", () => {
    const state: ListingFilterState = {
      ...emptyListingFilterState(),
      brands: ["Ubiquiti"],
      categories: ["Switching"],
    };
    const out = filterListingCatalog(records, state);
    assert.equal(out.length, 0);
  });

  it("ORs dimensions when logic=or", () => {
    const state: ListingFilterState = {
      ...emptyListingFilterState(),
      brands: ["Ubiquiti"],
      categories: ["Switching"],
      logic: "or",
    };
    const out = filterListingCatalog(records, state);
    assert.equal(out.length, 2);
  });
});

describe("applyNavigationMode", () => {
  it("REPLACE replaces parent", () => {
    const parent = [item({ id: "a", label: "A", sortOrder: 0 })];
    const local = nav({
      id: "l",
      scopeType: "PAGE",
      mode: "REPLACE",
      items: [item({ id: "b", label: "B", sortOrder: 0 })],
    });
    assert.deepEqual(
      applyNavigationMode(parent, local).map((i) => i.id),
      ["b"],
    );
  });
});

describe("emptyCatalogNavigation defaults", () => {
  it("GLOBAL defaults enabled and surfaces", () => {
    const g = emptyCatalogNavigation("GLOBAL");
    assert.equal(g.enabled, true);
    assert.equal(g.mode, "REPLACE");
    assert.ok(g.surfaces?.products);
  });

  it("scoped defaults to INHERIT", () => {
    const b = emptyCatalogNavigation("BRAND", "ubiquiti");
    assert.equal(b.mode, "INHERIT");
    assert.equal(b.scopeId, "ubiquiti");
  });
});
