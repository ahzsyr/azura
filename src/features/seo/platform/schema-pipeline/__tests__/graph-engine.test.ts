import test from "node:test";
import assert from "node:assert/strict";
import { deepMergeSchemaNodes, detectProtectedIdentityMutations } from "../graph/deep-merge";
import { resolveOrganizationSchemaType } from "../type-model";
import { SchemaPipeline } from "../index";
import { createHomeContextFixture, createProductContextFixture } from "./fixtures";
import type { SchemaContext } from "../types";

test("resolveOrganizationSchemaType defaults to most-specific single type", () => {
  assert.equal(resolveOrganizationSchemaType({ entityType: "WholesaleStore" }), "WholesaleStore");
});

test("resolveOrganizationSchemaType supports explicit supertypes", () => {
  assert.deepEqual(
    resolveOrganizationSchemaType({
      entityType: "WholesaleStore",
      typeRepresentation: "explicit-supertypes",
    }),
    ["Organization", "WholesaleStore"],
  );
});

test("deepMergeSchemaNodes merges nested address without wholesale replace", () => {
  const merged = deepMergeSchemaNodes(
    {
      address: {
        "@type": "PostalAddress",
        streetAddress: "Line 1",
        addressLocality: "Dubai",
      },
    },
    {
      address: {
        postalCode: "00000",
      },
    },
  );
  const address = merged.address as Record<string, unknown>;
  assert.equal(address.streetAddress, "Line 1");
  assert.equal(address.addressLocality, "Dubai");
  assert.equal(address.postalCode, "00000");
});

test("detectProtectedIdentityMutations flags @id changes as error", () => {
  const diagnostics = detectProtectedIdentityMutations(
    { "@id": "https://example.com/#organization", "@type": "WholesaleStore" },
    { "@id": "https://example.com/#other", founder: "Jane" },
  );
  assert.ok(diagnostics.some((d) => d.code === "PROTECTED_IDENTITY_MUTATION"));
});

test("home graph includes canonical business entity, brand, website, webpage", () => {
  const result = SchemaPipeline.build(createHomeContextFixture());
  const types = result.graph["@graph"].flatMap((node) => {
    const type = node["@type"];
    if (typeof type === "string") return [type];
    if (Array.isArray(type)) return type;
    return [];
  });
  assert.ok(types.includes("ElectronicsStore"));
  assert.ok(types.includes("Brand"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("WebPage"));
  const org = result.graph["@graph"].find((n) => n["@id"] === "https://example.com/#organization");
  assert.ok(org);
  const brand = result.graph["@graph"].find((n) => n["@id"] === "https://example.com/#brand");
  assert.ok(brand);
  const logo = result.graph["@graph"].find((n) => n["@id"] === "https://example.com/#logo");
  assert.ok(logo);
});

test("product graph uses canonical /#product and mainEntity relationships", () => {
  const result = SchemaPipeline.build(createProductContextFixture());
  const product = result.graph["@graph"].find((n) => n["@type"] === "Product");
  const webpage = result.graph["@graph"].find((n) => n["@type"] === "WebPage");
  assert.equal(product?.["@id"], "https://example.com/products/industrial-router/#product");
  assert.ok(product?.offers);
  assert.equal(
    (webpage?.mainEntity as { "@id"?: string })?.["@id"],
    "https://example.com/products/industrial-router/#product",
  );
  assert.equal(
    (product?.mainEntityOfPage as { "@id"?: string })?.["@id"],
    "https://example.com/products/industrial-router/#webpage",
  );
});

test("quote-only product omits offers and does not use product.id as sku", () => {
  const ctx = createProductContextFixture();
  const product = ctx.page.product!;
  product.availability = "RequestQuote";
  product.price = { value: 0, currency: "USD" };
  product.mpn = undefined;
  product.manufacturer_part_number = undefined;
  const result = SchemaPipeline.build(ctx);
  const productNode = result.graph["@graph"].find((n) => n["@type"] === "Product");
  assert.equal(productNode?.offers, undefined);
  assert.equal(productNode?.sku, undefined);
});

test("home graph omits SearchAction when public search is disabled", () => {
  const ctx = createHomeContextFixture();
  ctx.runtime.publicSearchEnabled = false;
  const result = SchemaPipeline.build(ctx);
  const website = result.graph["@graph"].find((n) => n["@type"] === "WebSite");
  assert.equal(website?.potentialAction, undefined);
});

test("home graph includes SearchAction when public search is enabled", () => {
  const ctx = createHomeContextFixture();
  ctx.runtime.publicSearchEnabled = true;
  const result = SchemaPipeline.build(ctx);
  const website = result.graph["@graph"].find((n) => n["@type"] === "WebSite");
  const action = website?.potentialAction as { "@type"?: string; target?: { urlTemplate?: string } };
  assert.equal(action?.["@type"], "SearchAction");
  assert.match(String(action?.target?.urlTemplate ?? ""), /\/search\?q=\{search_term_string\}/);
  assert.doesNotMatch(String(action?.target?.urlTemplate ?? ""), /\/en\/search/);
});

test("WebPage url uses document canonical from runtime context", () => {
  const ctx = createProductContextFixture();
  ctx.runtime.canonicalUrl = "https://example.com/custom-canonical";
  const result = SchemaPipeline.build(ctx);
  const webpage = result.graph["@graph"].find((n) => n["@type"] === "WebPage");
  assert.equal(webpage?.url, "https://example.com/custom-canonical");
});

test("home graph does not include top-level SearchAction or organization Review", () => {
  const ctx = createHomeContextFixture();
  ctx.page.reviews = [{ name: "Test", rating: 5, content: "Great" }];
  const result = SchemaPipeline.build(ctx);
  assert.equal(
    result.graph["@graph"].filter((n) => n["@type"] === "SearchAction").length,
    0,
  );
  const org = result.graph["@graph"].find((n) => n["@id"] === "https://example.com/#organization");
  assert.equal(org?.review, undefined);
  assert.equal(org?.aggregateRating, undefined);
});
