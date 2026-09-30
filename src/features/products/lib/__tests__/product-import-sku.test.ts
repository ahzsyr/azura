import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveImportTarget,
  type ImportTargetDeps,
} from "@/features/products/lib/product-import-target";

function deps(overrides: Partial<ImportTargetDeps>): ImportTargetDeps {
  return {
    slugExists: async () => false,
    skuLookup: async () => null,
    ...overrides,
  };
}

test("overwrite: same SKU different slug resolves to existing product slug", async () => {
  const result = await resolveImportTarget(
    "widget-b",
    "ABC-123",
    "overwrite",
    "suffix",
    new Set(),
    new Map(),
    deps({
      skuLookup: async (sku) => (sku === "ABC-123" ? "widget-a" : null),
    }),
  );

  assert.equal(result.decision, "write");
  assert.equal(result.slug, "widget-a");
  assert.equal(result.skuMatchedSlug, "widget-a");
});

test("skip: same SKU different slug is skipped with message", async () => {
  const result = await resolveImportTarget(
    "widget-b",
    "ABC-123",
    "skip",
    "suffix",
    new Set(),
    new Map(),
    deps({
      skuLookup: async (sku) => (sku === "ABC-123" ? "widget-a" : null),
    }),
  );

  assert.equal(result.decision, "skip");
  assert.match(result.message ?? "", /SKU "ABC-123" already used by "widget-a"/);
});

test("overwrite: same slug and same SKU updates in place without suffix", async () => {
  const result = await resolveImportTarget(
    "widget-a",
    "ABC-123",
    "overwrite",
    "suffix",
    new Set(),
    new Map(),
    deps({
      slugExists: async (slug) => slug === "widget-a",
      skuLookup: async (sku) => (sku === "ABC-123" ? "widget-a" : null),
    }),
  );

  assert.equal(result.decision, "write");
  assert.equal(result.slug, "widget-a");
  assert.equal(result.skuMatchedSlug, undefined);
});

test("suffix: slug taken with different SKU allocates suffixed slug", async () => {
  const result = await resolveImportTarget(
    "widget",
    "SKU-NEW",
    "overwrite",
    "suffix",
    new Set(),
    new Map(),
    deps({
      slugExists: async (slug) => slug === "widget",
    }),
  );

  assert.equal(result.decision, "write");
  assert.equal(result.slug, "widget-2");
});

test("overwrite: batch duplicate SKU updates first item slug", async () => {
  const reservedSlugs = new Set<string>(["widget-a"]);
  const reservedSkus = new Map<string, string>([["ABC-123", "widget-a"]]);

  const result = await resolveImportTarget(
    "widget-b",
    "ABC-123",
    "overwrite",
    "suffix",
    reservedSlugs,
    reservedSkus,
    deps(),
  );

  assert.equal(result.decision, "write");
  assert.equal(result.slug, "widget-a");
  assert.equal(result.skuMatchedSlug, "widget-a");
});

test("skip: batch duplicate SKU is skipped", async () => {
  const reservedSkus = new Map<string, string>([["ABC-123", "widget-a"]]);

  const result = await resolveImportTarget(
    "widget-b",
    "ABC-123",
    "skip",
    "suffix",
    new Set(),
    reservedSkus,
    deps(),
  );

  assert.equal(result.decision, "skip");
  assert.match(result.message ?? "", /already imported in this batch/);
});

test("null SKU falls back to slug-only resolution", async () => {
  let skuLookupCalled = false;

  const result = await resolveImportTarget(
    "widget",
    null,
    "overwrite",
    "suffix",
    new Set(),
    new Map(),
    deps({
      slugExists: async (slug) => slug === "widget",
      skuLookup: async () => {
        skuLookupCalled = true;
        return null;
      },
    }),
  );

  assert.equal(skuLookupCalled, false);
  assert.equal(result.decision, "write");
  assert.equal(result.slug, "widget-2");
});
