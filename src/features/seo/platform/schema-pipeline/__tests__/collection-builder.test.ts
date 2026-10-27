import assert from "node:assert/strict";
import test from "node:test";
import { CollectionPageBuilder } from "../builders/collection.builder";
import type { SchemaContext } from "../types";

function baseCtx(overrides?: Partial<SchemaContext["page"]>): SchemaContext {
  return {
    site: {
      company: null,
      brand: { brandName: "Azura", brandShort: "Azura", tagline: "", logoUrl: "" },
      logoUrl: "",
      locales: [],
      structuredConfig: {},
      businessPhotos: [],
    },
    page: {
      pageType: "collection",
      path: "/categories/routers",
      title: "Routers",
      description: "Browse routers",
      faqItems: [],
      breadcrumbItems: [{ name: "Categories", href: "/categories" }],
      listingItems: [
        { name: "Router A", url: "https://example.com/products/router-a" },
        { name: "Router B", url: "https://example.com/products/router-b" },
      ],
      ...overrides,
    },
    runtime: {
      locale: "en",
      localePrefix: "en",
      canonicalUrl: "https://example.com/categories/routers",
      siteOrigin: "https://example.com",
      environment: "test",
    },
  };
}

test("CollectionPageBuilder emits CollectionPage and ItemList from listingItems", () => {
  const ctx = baseCtx();
  assert.equal(CollectionPageBuilder.supports(ctx), true);
  const nodes = CollectionPageBuilder.build(ctx);
  const collection = nodes.find((n) => n["@type"] === "CollectionPage");
  const list = nodes.find((n) => n["@type"] === "ItemList");
  assert.ok(collection);
  assert.ok(list);
  assert.equal(list?.numberOfItems, 2);
  const elements = list?.itemListElement as Array<{ url: string }>;
  assert.equal(elements[0]?.url, "https://example.com/products/router-a");
});

test("CollectionPageBuilder omits ItemList when listing is empty", () => {
  const nodes = CollectionPageBuilder.build(baseCtx({ listingItems: [] }));
  assert.ok(nodes.some((n) => n["@type"] === "CollectionPage"));
  assert.equal(
    nodes.some((n) => n["@type"] === "ItemList"),
    false,
  );
});
