import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchingBrandsForFields } from "@/features/catalog/brand-matching";
import {
  defaultBrandMatchRules,
  emptyCatalogBrandProfile,
  ensureDefaultBrandMatchRules,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";
import { emptyRuleGroup } from "@/features/categories/matching";
import {
  filterRecordsForBrandProfile,
} from "@/features/catalog/brand-matching";

function profile(overrides: Partial<CatalogBrandProfile>): CatalogBrandProfile {
  return {
    ...emptyCatalogBrandProfile(overrides.sortOrder ?? 0),
    slug: "brand",
    name: "Brand",
    ...overrides,
  };
}

describe("brand matching rules", () => {
  it("does not match when rules are empty", () => {
    const matched = matchingBrandsForFields(
      { brand: "Apple", title: "iPhone" },
      [profile({ slug: "apple", name: "Apple", conditions: emptyRuleGroup("any") })],
    );
    assert.equal(matched.length, 0);
  });

  it("matches the identity brand-equals rule", () => {
    const apple = profile({
      slug: "apple",
      name: "Apple",
      sortOrder: 0,
      conditions: defaultBrandMatchRules("Apple"),
    });
    const matched = matchingBrandsForFields({ brand: "Apple", title: "iPhone" }, [apple]);
    assert.equal(matched[0]?.slug, "apple");
  });

  it("matches custom title rules like categories", () => {
    const mikrotik = profile({
      slug: "mikrotik",
      name: "MikroTik",
      conditions: {
        kind: "group",
        match: "any",
        children: [{ kind: "leaf", field: "title", operator: "contains", value: "RouterOS" }],
      },
    });
    const matched = matchingBrandsForFields(
      { brand: "", title: "hAP ax³ RouterOS" },
      [mikrotik],
    );
    assert.equal(matched[0]?.slug, "mikrotik");
  });

  it("picks the lowest sortOrder when multiple brands match", () => {
    const second = profile({
      slug: "second",
      name: "Second",
      sortOrder: 2,
      conditions: defaultBrandMatchRules("Shared"),
    });
    const first = profile({
      slug: "first",
      name: "First",
      sortOrder: 1,
      conditions: defaultBrandMatchRules("Shared"),
    });
    const matched = matchingBrandsForFields({ brand: "Shared" }, [second, first]);
    assert.equal(matched[0]?.slug, "first");
    assert.equal(matched.length, 2);
  });

  it("fills empty rules with brand-equals defaults without replacing custom trees", () => {
    const filled = ensureDefaultBrandMatchRules(
      profile({ name: "Ubiquiti", conditions: emptyRuleGroup("any") }),
    );
    assert.equal(filled.conditions.children.length, 1);
    const custom = {
      kind: "group" as const,
      match: "any" as const,
      children: [{ kind: "leaf" as const, field: "title", operator: "contains" as const, value: "UniFi" }],
    };
    const kept = ensureDefaultBrandMatchRules(profile({ name: "Ubiquiti", conditions: custom }));
    const leaf = kept.conditions.children[0];
    assert.equal(kept.conditions.children.length, 1);
    assert.ok(leaf && "field" in leaf);
    assert.equal(leaf.field, "title");
    assert.equal(leaf.operator, "contains");
    assert.equal(leaf.value, "UniFi");
  });

  it("matches listing records via brand profile rules", () => {
    const ubiquiti = profile({
      slug: "ubiquiti",
      name: "Ubiquiti",
      conditions: defaultBrandMatchRules("Ubiquiti"),
    });
    const records = [
      {
        slug: "uap",
        id: "1",
        name: "UAP",
        brand: "Ubiquiti",
        categories: [],
        tags: [],
        price: { value: 100, currency: "USD" },
        priceMin: 100,
        priceMax: 100,
        in_stock: true,
        conditions: [],
        variationFacets: {},
        collectionSlugs: [],
        searchText: "",
        sortName: "uap",
        sortPrice: 100,
      },
      {
        slug: "other",
        id: "2",
        name: "Other",
        brand: "Other",
        categories: [],
        tags: [],
        price: { value: 50, currency: "USD" },
        priceMin: 50,
        priceMax: 50,
        in_stock: true,
        conditions: [],
        variationFacets: {},
        collectionSlugs: [],
        searchText: "",
        sortName: "other",
        sortPrice: 50,
      },
    ];
    const matched = filterRecordsForBrandProfile(records, ubiquiti);
    assert.equal(matched.length, 1);
    assert.equal(matched[0]?.slug, "uap");
  });
});
