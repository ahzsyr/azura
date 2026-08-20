import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyProductOrdering } from "../apply-product-ordering";
import {
  createEmptyProfile,
  parseProductOrderingSettings,
  type ProductOrderingProfile,
} from "../product-ordering.schema";
import { resolveProductOrderingProfile, findProductOrderingProfileById } from "../resolve-product-ordering-profile";
import type { OrderableListingRecord } from "../apply-product-ordering";

function record(
  partial: Partial<OrderableListingRecord> & Pick<OrderableListingRecord, "slug" | "name">,
): OrderableListingRecord {
  return {
    id: partial.id ?? partial.slug,
    brand: partial.brand,
    category: partial.category ?? null,
    categories: partial.categories ?? [],
    tags: partial.tags ?? [],
    price: partial.price ?? { value: partial.priceMin ?? 0, currency: "USD" },
    priceMin: partial.priceMin ?? 0,
    priceMax: partial.priceMax ?? partial.priceMin ?? 0,
    mpn: partial.mpn,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: partial.collectionSlugs ?? [],
    searchText: partial.searchText ?? partial.name,
    ...partial,
  };
}

function baseProfile(overrides: Partial<ProductOrderingProfile> = {}): ProductOrderingProfile {
  return {
    ...createEmptyProfile({ name: "Test", scope: { type: "GLOBAL" } }),
    enabled: true,
    scope: { type: "GLOBAL" },
    defaultSort: "name-asc",
    brandPriority: [],
    categoryPriority: [],
    keywordPriority: [],
    pinnedProductSlugs: [],
    ruleOrder: ["pinned", "keywords", "brands", "categories", "default"],
    ...overrides,
  };
}

describe("parseProductOrderingSettings", () => {
  it("always ensures a GLOBAL profile and full ruleOrder", () => {
    const parsed = parseProductOrderingSettings({
      profiles: [
        {
          name: "Nike",
          scope: { type: "BRAND", targetId: "Nike" },
          ruleOrder: ["brands"],
          brandPriority: ["Nike", "Nike", "  "],
        },
      ],
    });

    assert.equal(parsed.profiles.some((p) => p.scope.type === "GLOBAL"), true);
    const brand = parsed.profiles.find((p) => p.scope.type === "BRAND");
    assert.deepEqual(brand?.brandPriority, ["Nike"]);
    assert.deepEqual(brand?.ruleOrder, [
      "brands",
      "pinned",
      "keywords",
      "categories",
      "default",
    ]);
  });

  it("prevents duplicate scope+target profiles", () => {
    const parsed = parseProductOrderingSettings({
      profiles: [
        { name: "A", scope: { type: "CATEGORY", targetId: "serums" } },
        { name: "B", scope: { type: "CATEGORY", targetId: "serums" } },
        { name: "C", scope: { type: "GLOBAL" } },
      ],
    });
    assert.equal(parsed.profiles.filter((p) => p.scope.type === "CATEGORY").length, 1);
    assert.equal(parsed.profiles.filter((p) => p.scope.type === "GLOBAL").length, 1);
  });
});

describe("resolveProductOrderingProfile", () => {
  it("prefers BRAND exact over GLOBAL, and PRODUCT_LIST only for product list surface", () => {
    const settings = parseProductOrderingSettings({
      profiles: [
        { id: "g", name: "Global", scope: { type: "GLOBAL" }, enabled: true },
        {
          id: "pl",
          name: "Product List",
          scope: { type: "PRODUCT_LIST" },
          enabled: true,
        },
        {
          id: "b",
          name: "Demar3",
          scope: { type: "BRAND", targetId: "Demar3" },
          enabled: true,
        },
        {
          id: "c",
          name: "Serums",
          scope: { type: "CATEGORY", targetId: "serums" },
          enabled: true,
        },
      ],
    });

    assert.equal(
      resolveProductOrderingProfile(settings, { surface: "BRAND", targetId: "Demar3" })?.id,
      "b",
    );
    assert.equal(
      resolveProductOrderingProfile(settings, { surface: "CATEGORY", targetId: "serums" })?.id,
      "c",
    );
    assert.equal(resolveProductOrderingProfile(settings, { surface: "PRODUCT_LIST" })?.id, "pl");
    assert.equal(
      resolveProductOrderingProfile(settings, {
        surface: "CATEGORY",
        targetId: "other",
      })?.id,
      "g",
    );
  });
});

describe("findProductOrderingProfileById", () => {
  const settings = parseProductOrderingSettings({
    profiles: [
      { id: "g", name: "Global Ordering", scope: { type: "GLOBAL" }, enabled: true },
      {
        id: "b",
        name: "Demar3",
        scope: { type: "BRAND", targetId: "Demar3" },
        enabled: true,
      },
      {
        id: "off",
        name: "Disabled",
        scope: { type: "PRODUCT_LIST" },
        enabled: false,
      },
    ],
  });

  it("defaults empty id to Global Ordering", () => {
    assert.equal(findProductOrderingProfileById(settings, "")?.id, "g");
    assert.equal(findProductOrderingProfileById(settings, null)?.id, "g");
  });

  it("resolves an enabled profile by id", () => {
    assert.equal(findProductOrderingProfileById(settings, "b")?.id, "b");
  });

  it("falls back to Global for unknown or disabled ids", () => {
    assert.equal(findProductOrderingProfileById(settings, "missing")?.id, "g");
    assert.equal(findProductOrderingProfileById(settings, "off")?.id, "g");
  });
});

describe("applyProductOrdering buckets", () => {
  const products = [
    record({ slug: "demar3-serum", name: "Demar3 Serum", brand: "Demar3", priceMin: 30 }),
    record({ slug: "demar3-cleanser", name: "Demar3 Cleanser", brand: "Demar3", priceMin: 20 }),
    record({ slug: "demar3-toner", name: "Demar3 Toner", brand: "Demar3", priceMin: 25 }),
    record({ slug: "other-serum", name: "Other Serum", brand: "Lavien", priceMin: 15 }),
    record({ slug: "other-product", name: "Other Product", brand: "House of Dohwa", priceMin: 10 }),
  ];

  it("assigns Brands before Keywords when Brands is first", () => {
    const profile = baseProfile({
      defaultSort: "price-asc",
      brandPriority: ["Demar3"],
      keywordPriority: [{ id: "kw1", keyword: "serum", fields: ["name"] }],
      ruleOrder: ["brands", "keywords", "default", "pinned", "categories"],
    });

    const ordered = applyProductOrdering(products, profile).map((p) => p.slug);
    assert.deepEqual(ordered, [
      "demar3-cleanser",
      "demar3-toner",
      "demar3-serum",
      "other-serum",
      "other-product",
    ]);
  });

  it("lets Keywords win when Keywords precede Brands", () => {
    const profile = baseProfile({
      defaultSort: "price-asc",
      brandPriority: ["Demar3"],
      keywordPriority: [{ id: "kw1", keyword: "serum", fields: ["name"] }],
      ruleOrder: ["keywords", "brands", "default", "pinned", "categories"],
    });

    const ordered = applyProductOrdering(products, profile).map((p) => p.slug);
    assert.deepEqual(ordered, [
      "other-serum",
      "demar3-serum",
      "demar3-cleanser",
      "demar3-toner",
      "other-product",
    ]);
  });

  it("pins specific products to the top", () => {
    const profile = baseProfile({
      pinnedProductSlugs: ["other-product", "demar3-toner"],
      ruleOrder: ["pinned", "keywords", "brands", "categories", "default"],
    });
    const ordered = applyProductOrdering(products, profile).map((p) => p.slug);
    assert.deepEqual(ordered.slice(0, 2), ["other-product", "demar3-toner"]);
  });

  it("ranks best-selling tags first for defaultSort best-selling", () => {
    const profile = baseProfile({
      defaultSort: "best-selling",
      ruleOrder: ["default", "pinned", "keywords", "brands", "categories"],
    });
    const list = [
      record({ slug: "a", name: "Alpha", tags: [] }),
      record({ slug: "b", name: "Beta", tags: ["badge:bestseller"] }),
      record({ slug: "c", name: "Charlie", tags: ["featured"] }),
    ];
    assert.deepEqual(
      applyProductOrdering(list, profile).map((p) => p.slug),
      ["b", "a", "c"],
    );
  });
});
