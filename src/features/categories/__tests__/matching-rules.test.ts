import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  emptyRuleGroup,
  explainEntityMatch,
  matchEntityToRulesBool,
  productToRuleFields,
  upgradeLegacyRuleSet,
  isEmptyRuleTree,
  type RuleGroup,
} from "@/features/categories/matching";
import { matchProductToCollection, catalogProductToCollectionProduct, type CollectionEngineProduct } from "@/features/collections/engine";
import type { Collection } from "@/features/collections/types";
import { categoriesToCollections } from "@/features/categories/category-collection-view";
import type { Category } from "@/features/categories/types";
import type { Product } from "@/features/products/types";

const sampleProduct: CollectionEngineProduct = {
  id: "1",
  slug: "macbook-pro",
  name: "Apple MacBook Pro 16",
  category: "Laptops",
  categories: ["Computers", "Laptops"],
  brand: "Apple",
  price: 2499,
  tags: ["pro", "badge:new"],
  status: "InStock",
  stock: "in-stock",
  badge: "new",
};

/** Accepts RuleGroup or legacy flat { rules[] } — upgrades on the way in. */
function collection(conditions: unknown): Collection {
  return {
    id: "c1",
    slug: "test",
    name: "Test",
    description: "",
    conditions: upgradeLegacyRuleSet(conditions),
  };
}

describe("Matching Rules — empty and root contracts", () => {
  it("empty rule tree matches nothing", () => {
    const root = emptyRuleGroup("any");
    assert.equal(isEmptyRuleTree(root), true);
    assert.equal(matchEntityToRulesBool({ brand: "Apple" }, root), false);
  });

  it("legacy empty rules match nothing via collection engine", () => {
    assert.equal(
      matchProductToCollection(sampleProduct, collection({ match: "any", rules: [] })),
      false
    );
  });

  it("upgradeLegacy wraps bare leaf into a root group", () => {
    const root = upgradeLegacyRuleSet({
      field: "brand",
      operator: "equals",
      value: "Apple",
    });
    assert.equal(root.match, "any");
    assert.equal(root.children.length, 1);
    assert.equal(matchEntityToRulesBool({ brand: "Apple" }, root), true);
  });
});

describe("Matching Rules — legacy parity", () => {
  it("upgrades flat CollectionRuleSet and matches ANY", () => {
    const legacy = { match: "any" as const, rules: [{ field: "brand" as const, operator: "equals" as const, value: "Samsung" }, { field: "brand" as const, operator: "equals" as const, value: "Apple" }] };
    assert.equal(matchProductToCollection(sampleProduct, collection(legacy)), true);
    const root = upgradeLegacyRuleSet(legacy);
    assert.equal(matchEntityToRulesBool({ brand: "Apple" }, root), true);
  });

  it("matches ALL requiring every rule", () => {
    const legacy = {
      match: "all" as const,
      rules: [
        { field: "brand" as const, operator: "equals" as const, value: "Apple" },
        { field: "title" as const, operator: "contains" as const, value: "Pro" },
      ],
    };
    assert.equal(matchProductToCollection(sampleProduct, collection(legacy)), true);
    assert.equal(
      matchProductToCollection(
        { ...sampleProduct, name: "Apple MacBook Air" },
        collection(legacy)
      ),
      false
    );
  });

  it("category rule ORs singular category and categories[]", () => {
    const legacy = {
      match: "any" as const,
      rules: [{ field: "category" as const, operator: "equals" as const, value: "Computers" }],
    };
    assert.equal(matchProductToCollection(sampleProduct, collection(legacy)), true);
  });

  it("not_equals and starts_with operators", () => {
    assert.equal(
      matchProductToCollection(
        sampleProduct,
        collection({
          match: "all",
          rules: [
            { field: "brand", operator: "not_equals", value: "Samsung" },
            { field: "title", operator: "starts_with", value: "Apple" },
          ],
        })
      ),
      true
    );
  });
});

describe("Matching Rules — nested groups and operators", () => {
  it("supports nested ANY inside ALL", () => {
    const root: RuleGroup = {
      match: "all",
      children: [
        {
          match: "any",
          children: [
            { field: "brand", operator: "equals", value: "Apple" },
            { field: "brand", operator: "equals", value: "Samsung" },
          ],
        },
        { field: "price", operator: "greater_than", value: 1000 },
      ],
    };
    assert.equal(
      matchEntityToRulesBool(
        { brand: "Apple", price: 2499 },
        root
      ),
      true
    );
    assert.equal(
      matchEntityToRulesBool({ brand: "Apple", price: 500 }, root),
      false
    );
  });

  it("supports not_contains, ends_with, is_empty, is_not_empty", () => {
    assert.equal(
      matchEntityToRulesBool(
        { title: "MacBook Air" },
        { match: "all", children: [{ field: "title", operator: "not_contains", value: "Pro" }] }
      ),
      true
    );
    assert.equal(
      matchEntityToRulesBool(
        { title: "MacBook Pro" },
        { match: "all", children: [{ field: "title", operator: "ends_with", value: "Pro" }] }
      ),
      true
    );
    assert.equal(
      matchEntityToRulesBool(
        { badge: "" },
        { match: "all", children: [{ field: "badge", operator: "is_empty", value: "" }] }
      ),
      true
    );
    assert.equal(
      matchEntityToRulesBool(
        { brand: "Apple" },
        { match: "all", children: [{ field: "brand", operator: "is_not_empty" }] }
      ),
      true
    );
  });

  it("supports numeric between and list contains_any", () => {
    assert.equal(
      matchEntityToRulesBool(
        { price: 50 },
        { match: "all", children: [{ field: "price", operator: "between", values: [10, 100] }] }
      ),
      true
    );
    assert.equal(
      matchEntityToRulesBool(
        { tags: ["wifi", "outdoor"] },
        {
          match: "all",
          children: [{ field: "tags", operator: "contains_any", values: ["outdoor", "indoor"] }],
        }
      ),
      true
    );
  });

  it("supports in / not_in and boolean is_true", () => {
    assert.equal(
      matchEntityToRulesBool(
        { brand: "Apple" },
        { match: "all", children: [{ field: "brand", operator: "in", values: ["Apple", "Samsung"] }] }
      ),
      true
    );
    assert.equal(
      matchEntityToRulesBool(
        { featured: true },
        { match: "all", children: [{ field: "featured", operator: "is_true" }] }
      ),
      true
    );
  });

  it("normalizes case and whitespace for equals", () => {
    assert.equal(
      matchEntityToRulesBool(
        { brand: "  APPLE " },
        { match: "all", children: [{ field: "brand", operator: "equals", value: "apple" }] }
      ),
      true
    );
  });
});

describe("Matching Rules — explain", () => {
  it("explains why an entity matched", () => {
    const root: RuleGroup = {
      match: "all",
      children: [
        { field: "brand", operator: "equals", value: "Apple" },
        { field: "title", operator: "contains", value: "Pro" },
      ],
    };
    const result = explainEntityMatch(
      { brand: "Apple", title: "MacBook Pro" },
      root
    );
    assert.equal(result.matched, true);
    assert.ok(result.entries.some((e) => e.field === "brand" && e.passed));
    assert.ok(result.entries.some((e) => e.field === "title" && e.passed));
  });

  it("explains failed rules", () => {
    const result = explainEntityMatch(
      { brand: "Samsung" },
      { match: "all", children: [{ field: "brand", operator: "equals", value: "Apple" }] }
    );
    assert.equal(result.matched, false);
    assert.ok(result.entries.some((e) => e.field === "brand" && !e.passed));
  });
});

describe("Matching Rules — specification fields", () => {
  it("matches products via flattened spec:<key> fields", () => {
    const product = {
      id: "p-spec",
      slug: "u6-pro",
      name: "U6 Pro",
      productTitle: "U6 Pro",
      brand: "Ubiquiti",
      category: "Access Points",
      categories: ["Networking", "Access Points"],
      tags: ["wifi"],
      mpn: "U6-Pro",
      short_description: "Ceiling AP",
      price: { value: 159, currency: "USD" },
      media: {},
      reviews: { rating: 0, count: 0 },
      specifications: [
        {
          technology: "WiFi",
          features: [
            { name: "Wi-Fi Standard", value: "WiFi 6" },
            { name: "MIMO", value: "4x4" },
          ],
        },
      ],
    } as Product;

    const fields = productToRuleFields(product.slug, product);
    assert.equal(fields["spec:Wi-Fi Standard"], "WiFi 6");
    assert.equal(fields.mpn, "U6-Pro");
    assert.ok(String(fields.description).includes("Ceiling AP"));
    assert.ok(Array.isArray(fields.specification));
    assert.ok((fields.specification as string[]).includes("WiFi 6"));
    assert.ok((fields.specification as string[]).includes("Wi-Fi Standard: WiFi 6"));

    const root: RuleGroup = {
      kind: "group",
      match: "all",
      children: [
        { kind: "leaf", field: "spec:Wi-Fi Standard", operator: "contains", value: "WiFi 6" },
        { kind: "leaf", field: "mpn", operator: "equals", value: "U6-Pro" },
      ],
    };

    assert.equal(matchEntityToRulesBool(fields, root), true);
    const explained = explainEntityMatch(fields, root);
    assert.equal(explained.matched, true);
    assert.ok(explained.entries.some((e) => e.field === "spec:Wi-Fi Standard" && e.passed));
  });

  it("matches products via unified specification field (contains)", () => {
    const product = {
      id: "p-spec-2",
      slug: "u6-lite",
      name: "U6 Lite",
      productTitle: "U6 Lite",
      brand: "Ubiquiti",
      price: { value: 99, currency: "USD" },
      media: {},
      reviews: { rating: 0, count: 0 },
      specifications: [
        {
          technology: "WiFi",
          features: [{ name: "Wi-Fi Standard", value: "WiFi 6" }],
        },
      ],
    } as Product;

    const fields = productToRuleFields(product.slug, product);
    const root: RuleGroup = {
      kind: "group",
      match: "any",
      children: [
        { kind: "leaf", field: "specification", operator: "contains", value: "WiFi 6" },
      ],
    };
    assert.equal(matchEntityToRulesBool(fields, root), true);
  });

  it("matches products via matchingRules source field", () => {
    const product = {
      id: "p-mr",
      slug: "switch-pro",
      name: "Switch Pro",
      productTitle: "Switch Pro",
      brand: "Ubiquiti",
      matchingRules: ["enterprise", "poe+"],
      matching_rules: "ignored-when-camel-present",
      price: { value: 299, currency: "USD" },
      media: {},
      reviews: { rating: 0, count: 0 },
    } as Product & { matching_rules?: string };

    const fields = productToRuleFields(product.slug, product);
    assert.deepEqual(fields.matchingRules, ["enterprise", "poe+"]);

    const root: RuleGroup = {
      kind: "group",
      match: "all",
      children: [
        { kind: "leaf", field: "matchingRules", operator: "contains", value: "enterprise" },
      ],
    };
    assert.equal(matchEntityToRulesBool(fields, root), true);

    const fromSnake = productToRuleFields("x", {
      ...product,
      matchingRules: undefined,
      matching_rules: "wifi, outdoor",
    } as Product & { matching_rules?: string });
    assert.deepEqual(fromSnake.matchingRules, ["wifi", "outdoor"]);
  });

  it("collection engine matches matchingRules the same as preview fields", () => {
    const product = {
      id: "p-indoor",
      slug: "u6-indoor",
      name: "U6 Indoor",
      productTitle: "U6 Indoor",
      brand: "Ubiquiti",
      matchingRules: ["indoor", "wifi"],
      price: { value: 99, currency: "USD" },
      media: {},
      reviews: { rating: 0, count: 0 },
    } as Product;

    const engine = catalogProductToCollectionProduct(product.slug, product);
    const col: Collection = {
      id: "c-indoor",
      slug: "indoor",
      name: "indoor",
      description: "",
      conditions: {
        kind: "group",
        match: "any",
        children: [
          { kind: "leaf", field: "matchingRules", operator: "contains", value: "indoor" },
        ],
      },
    };
    assert.equal(matchProductToCollection(engine, col), true);

    const outdoorOnly = catalogProductToCollectionProduct("x", {
      ...product,
      id: "p-out",
      matchingRules: ["outdoor"],
    } as Product);
    assert.equal(matchProductToCollection(outdoorOnly, col), false);
  });

  it("list contains does not reverse-match short tokens against the needle", () => {
    assert.equal(
      matchEntityToRulesBool(
        { matchingRules: ["in", "door"] },
        {
          kind: "group",
          match: "any",
          children: [
            { kind: "leaf", field: "matchingRules", operator: "contains", value: "indoor" },
          ],
        },
      ),
      false,
    );
    assert.equal(
      matchEntityToRulesBool(
        { matchingRules: ["wifi-indoor-ap"] },
        {
          kind: "group",
          match: "any",
          children: [
            { kind: "leaf", field: "matchingRules", operator: "contains", value: "indoor" },
          ],
        },
      ),
      true,
    );
  });
});

describe("Matching Rules — Category → Collection round-trip", () => {
  it("preserves nested children when mapping Category to Collection view", () => {
    const nested: RuleGroup = {
      kind: "group",
      match: "all",
      children: [
        {
          kind: "group",
          match: "any",
          children: [
            { kind: "leaf", field: "brand", operator: "equals", value: "Apple" },
            { kind: "leaf", field: "brand", operator: "equals", value: "Samsung" },
          ],
        },
        { kind: "leaf", field: "price", operator: "greater_than", value: 1000 },
      ],
    };

    const cat: Category = {
      id: "cat-1",
      slug: "premium-laptops",
      scope: "PRODUCT",
      scopeOwnerId: null,
      sortOrder: 0,
      visible: true,
      showInNav: true,
      featured: false,
      membershipMode: "HYBRID",
      conditions: nested,
      metadata: { name: "Premium Laptops" },
    };

    const [col] = categoriesToCollections([cat]);
    assert.ok(col);
    assert.equal(col.conditions.match, "all");
    assert.equal(col.conditions.children.length, 2);
    const nestedChild = col.conditions.children[0];
    assert.ok(nestedChild && "children" in nestedChild);
    assert.equal((nestedChild as RuleGroup).match, "any");
    assert.equal((nestedChild as RuleGroup).children.length, 2);
    assert.equal(matchProductToCollection(sampleProduct, col), true);
  });

  it("upgrades legacy flat rules on Category → Collection mapping", () => {
    const cat = {
      id: "cat-2",
      slug: "apple",
      scope: "PRODUCT" as const,
      scopeOwnerId: null,
      sortOrder: 0,
      visible: true,
      showInNav: true,
      featured: false,
      membershipMode: "HYBRID" as const,
      conditions: upgradeLegacyRuleSet({
        match: "any",
        rules: [{ field: "brand", operator: "equals", value: "Apple" }],
      }),
      metadata: { name: "Apple" },
    } satisfies Category;

    const [col] = categoriesToCollections([cat]);
    assert.equal(col.conditions.children.length, 1);
    assert.ok("field" in col.conditions.children[0]);
    assert.equal((col.conditions.children[0] as { field: string }).field, "brand");
  });
});

describe("Matching Rules — Specification field UI model", () => {
  it("includes plan fields and Specification in the picker", async () => {
    const { buildMatchingRuleFieldGroups, SPECIFICATION_FIELD, MATCHING_RULES_FIELD } =
      await import("@/features/categories/matching/specification-field-ui");
    const groups = buildMatchingRuleFieldGroups();
    const specs = groups.find((g) => g.label === "Specifications");
    assert.ok(specs);
    assert.equal(specs!.options.length, 1);
    assert.equal(specs!.options[0]!.value, SPECIFICATION_FIELD);
    assert.equal(specs!.options[0]!.label, "Specification");
    const product = groups.find((g) => g.label === "Product Fields");
    assert.ok(product);
    assert.ok(product!.options.some((o) => o.value === "brand"));
    assert.ok(product!.options.some((o) => o.value === MATCHING_RULES_FIELD));
    assert.ok(product!.options.some((o) => o.value === "mainCategory"));
    assert.ok(product!.options.some((o) => o.value === "environment"));
    assert.ok(product!.options.some((o) => o.value === "mountingMethod"));
    assert.ok(product!.options.some((o) => o.value === "generation"));
    assert.ok(product!.options.some((o) => o.value === "antennaDesign"));
    assert.ok(product!.options.some((o) => o.value === "categories"));
    assert.ok(product!.options.some((o) => o.value === "categoryAncestors"));
    assert.ok(!product!.options.some((o) => o.value === SPECIFICATION_FIELD));
  });
});

describe("Matching Rules — dual taxonomy fields", () => {
  it("matches mainCategory and environment aliases from converter JSON", () => {
    const product = {
      id: "p-airfiber",
      slug: "airfiber-60-xg",
      name: "Ubiquiti airFiber 60 XG",
      productTitle: "Ubiquiti airFiber 60 XG",
      brand: "Ubiquiti",
      mainCategory: "Outdoor",
      category: "Radio Systems",
      categories: [
        "Ubiquiti",
        "60 GHz Wireless",
        "airFiber 60 GHz",
        "Outdoor Wireless",
        "Carrier Backhaul Radio",
        "Radio Systems",
      ],
      matchingRules: ["outdoor", "outdoor_device"],
      price: { value: 999, currency: "USD" },
      media: {},
      reviews: { rating: 0, count: 0 },
      specifications: [
        {
          technology: "Radio",
          items: [
            { name: "Environment", value: "Outdoor" },
            { name: "Mounting Method", value: "Pole" },
            { name: "Generation", value: "WiFi 6" },
            { name: "Antenna Design", value: "Integrated" },
          ],
        },
      ],
    } as Product;

    const fields = productToRuleFields(product.slug, product);
    assert.equal(fields.mainCategory, "Outdoor");
    assert.equal(fields.environment, "Outdoor");
    assert.equal(fields.mountingMethod, "Pole");
    assert.equal(fields.generation, "WiFi 6");
    assert.equal(fields.antennaDesign, "Integrated");

    assert.equal(
      matchEntityToRulesBool(fields, {
        kind: "group",
        match: "all",
        children: [
          { kind: "leaf", field: "mainCategory", operator: "equals", value: "Outdoor" },
          { kind: "leaf", field: "environment", operator: "equals", value: "Outdoor" },
        ],
      }),
      true,
    );

    assert.equal(
      matchEntityToRulesBool(fields, {
        kind: "group",
        match: "any",
        children: [
          {
            kind: "leaf",
            field: "categories",
            operator: "contains_any",
            values: ["airFiber 60 GHz", "Radio Systems"],
          },
        ],
      }),
      true,
    );
  });
});
