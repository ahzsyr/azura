import test from "node:test";
import assert from "node:assert/strict";
import { catalogAttributeFiltersForSource, resolveCatalogSourceFromBlock, resolveCatalogTypeSlug } from "@/features/catalog/catalog-source";
import { catalogPropsSchema } from "@/schemas/catalog/display-settings";
import { upgradeBlockToV2 } from "@/features/builder/instance/block-instance";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import type { BlockNode } from "@/types/builder";

test("resolveCatalogTypeSlug maps legacy catalog sources and keeps custom types", () => {
  assert.equal(resolveCatalogTypeSlug("packages"), "catalog-items");
  assert.equal(resolveCatalogTypeSlug("hotels"), "listings");
  assert.equal(resolveCatalogTypeSlug("services"), "offerings");
  assert.equal(resolveCatalogTypeSlug("offerings"), "offerings");
  assert.equal(resolveCatalogTypeSlug("solutions"), "solutions");
  assert.equal(resolveCatalogTypeSlug(undefined), "catalog-items");
});

test("resolveCatalogSourceFromBlock prefers custom props source over default settings", () => {
  assert.equal(
    resolveCatalogSourceFromBlock({
      props: { source: "solutions" },
      settings: { source: "packages" },
    }),
    "solutions",
  );
  assert.equal(
    resolveCatalogSourceFromBlock({
      props: { source: "solutions" },
      settings: { source: "catalog-items" },
    }),
    "solutions",
  );
  assert.equal(
    resolveCatalogSourceFromBlock({
      props: { source: "solutions" },
      settings: { source: "solutions" },
    }),
    "solutions",
  );
  assert.equal(
    resolveCatalogSourceFromBlock({
      props: {},
      settings: { source: "solutions" },
    }),
    "solutions",
  );
});

test("catalog source survives v2 upgrade when settings still hold the default", () => {
  const block = {
    id: "block-catalog-1",
    type: "catalog",
    version: "2.0",
    props: { source: "solutions", title: "All Solutions" },
    settings: { source: "catalog-items", title: "Catalog" },
  } as BlockNode;

  assert.equal(resolveCatalogSourceFromBlock(block), "solutions");

  const upgraded = upgradeBlockToV2(block);
  assert.equal(resolveCatalogSourceFromBlock(upgraded), "solutions");
  assert.equal(upgraded.settings?.source, "solutions");
  assert.equal(upgraded.props?.source, "solutions");

  const { blocks } = migrateBlocksToBlockSystem([block]);
  assert.equal(resolveCatalogSourceFromBlock(blocks[0]), "solutions");
  assert.equal(blocks[0].settings?.source, "solutions");
  assert.equal(blocks[0].props?.source, "solutions");
});

test("catalogAttributeFiltersForSource ignores leftover offering filters on custom types", () => {
  const solutions = catalogAttributeFiltersForSource("solutions", {
    serviceType: "TRANSPORT",
    city: "MAKKAH",
    attributeFilters: {},
  });
  assert.deepEqual(solutions, {});
  const offerings = catalogAttributeFiltersForSource("services", {
    serviceType: "TRANSPORT",
    attributeFilters: {},
  });
  assert.equal(offerings.offeringType, "TRANSPORT");
});

test("catalogPropsSchema keeps custom content type slugs as Source", () => {
  const parsed = catalogPropsSchema.parse({
    source: "solutions",
    city: "DUBAI",
    serviceType: "MANAGED",
    attributeFilters: { offeringType: "TRANSPORT" },
  });
  assert.equal(parsed.source, "solutions");
  assert.equal(parsed.city, "DUBAI");
  assert.equal(parsed.serviceType, "MANAGED");
  assert.equal(parsed.attributeFilters.offeringType, "TRANSPORT");
});
