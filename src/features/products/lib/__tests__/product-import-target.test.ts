import assert from "node:assert/strict";
import test from "node:test";
import { resolveImportTarget } from "@/features/products/lib/product-import-target";

test("overwrite updates an existing slug instead of suffixing a duplicate", async () => {
  const resolved = await resolveImportTarget(
    "u7-pro-xg",
    "U7-Pro-XG-B",
    "overwrite",
    "suffix",
    new Set(),
    new Map(),
    {
      slugExists: async (slug) => slug === "u7-pro-xg",
      skuLookup: async () => null,
    },
  );
  assert.equal(resolved.decision, "write");
  assert.equal(resolved.slug, "u7-pro-xg");
});

test("SKU match overwrites the existing product even when import slug differs", async () => {
  const resolved = await resolveImportTarget(
    "u7-pro-xg",
    "U7-Pro-XG-B",
    "overwrite",
    "suffix",
    new Set(),
    new Map(),
    {
      slugExists: async () => false,
      skuLookup: async (sku) => (sku === "U7-Pro-XG-B" ? "legacy-u7" : null),
    },
  );
  assert.equal(resolved.decision, "write");
  assert.equal(resolved.slug, "legacy-u7");
  assert.equal(resolved.skuMatchedSlug, "legacy-u7");
});

test("suffix still allocates a new slug when overwrite is off", async () => {
  const resolved = await resolveImportTarget(
    "u7-pro-xg",
    null,
    "skip",
    "suffix",
    new Set(),
    new Map(),
    {
      slugExists: async (slug) => slug === "u7-pro-xg",
      skuLookup: async () => null,
    },
  );
  assert.equal(resolved.decision, "write");
  assert.equal(resolved.slug, "u7-pro-xg-2");
});
