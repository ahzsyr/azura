import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogAttributeFiltersForSource,
  normalizeCatalogSourceForActiveTypes,
  resolveCatalogSourceFromBlock,
  resolveCatalogTypeSlug,
} from "@/features/catalog/catalog-source";
import { catalogPropsSchema } from "@/schemas/catalog/display-settings";
import { upgradeBlockToV2 } from "@/features/builder/instance/block-instance";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import {
  isRetiredOfferingTypeSelectField,
  resolveContentTypeLabelPlural,
  resolveFieldSchema,
  selectFieldsFromSchema,
} from "@/features/content/content-type.registry";
import type { BlockNode } from "@/types/builder";

test("resolveCatalogTypeSlug maps legacy catalog sources and keeps custom types", () => {
  assert.equal(resolveCatalogTypeSlug("packages"), "catalog-items");
  assert.equal(resolveCatalogTypeSlug("hotels"), "listings");
  assert.equal(resolveCatalogTypeSlug("services"), "offerings");
  assert.equal(resolveCatalogTypeSlug("offerings"), "offerings");
  assert.equal(resolveCatalogTypeSlug("solutions"), "solutions");
  assert.equal(resolveCatalogTypeSlug(undefined), "catalog-items");
  assert.equal(resolveCatalogTypeSlug("services", ["services", "products"]), "services");
  assert.equal(resolveCatalogTypeSlug("services", ["offerings", "products"]), "offerings");
  assert.equal(resolveCatalogTypeSlug("offerings", ["services", "products"]), "services");
});

test("normalizeCatalogSourceForActiveTypes falls back when the selected source is no longer active", () => {
  assert.equal(normalizeCatalogSourceForActiveTypes("solutions", ["catalog-items", "listings"]), "catalog-items");
  assert.equal(normalizeCatalogSourceForActiveTypes("packages", ["catalog-items", "solutions"]), "catalog-items");
  assert.equal(normalizeCatalogSourceForActiveTypes("solutions", ["solutions", "listings"]), "solutions");
  assert.equal(normalizeCatalogSourceForActiveTypes(undefined, ["catalog-items", "listings"]), "catalog-items");
  assert.equal(
    normalizeCatalogSourceForActiveTypes("offerings", ["products", "services", "projects"]),
    "services",
  );
  assert.equal(
    normalizeCatalogSourceForActiveTypes("services", ["products", "services", "offerings"]),
    "services",
  );
  assert.equal(
    normalizeCatalogSourceForActiveTypes("offerings", ["products", "services", "offerings"]),
    "offerings",
  );
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
      props: { source: "services" },
      settings: { source: "services" },
    }),
    "services",
  );
});

test("canonical built-in content type labels match the live site names", () => {
  assert.equal(resolveContentTypeLabelPlural("offerings", "Offerings"), "Services");
  assert.equal(resolveContentTypeLabelPlural("catalog-items", "Catalog items"), "Catalog items");
  assert.equal(resolveContentTypeLabelPlural("listings", "Listings"), "Listings");
});

test("catalog blocks hide generic service type filters that do not exist for the active source", () => {
  const fields = selectFieldsFromSchema(
    [
      {
        key: "offeringType",
        type: "select",
        labelEn: "Type",
        options: [
          { value: "TRANSPORT", labelEn: "Transport" },
          { value: "AIRPORT_PICKUP", labelEn: "Airport pickup" },
          { value: "HOTEL", labelEn: "Hotel service" },
          { value: "OTHER", labelEn: "Other" },
        ],
      },
      {
        key: "city",
        type: "select",
        labelEn: "City",
        options: [{ value: "MAKKAH", labelEn: "Makkah" }],
      },
    ],
    "offerings",
  );
  assert.deepEqual(fields, [
    { key: "city", label: "City", options: [{ value: "MAKKAH", label: "Makkah" }] },
  ]);
  assert.equal(
    isRetiredOfferingTypeSelectField({
      key: "offeringType",
      label: "Type",
      options: [
        { value: "TRANSPORT" },
        { value: "AIRPORT_PICKUP" },
        { value: "HOTEL" },
        { value: "OTHER" },
      ],
    }),
    true,
  );
  const resolved = resolveFieldSchema(
    {
      fieldSchema: [
        {
          key: "offeringType",
          type: "select",
          labelEn: "Type",
          options: [{ value: "TRANSPORT", labelEn: "Transport" }],
        },
      ],
    },
    "offerings",
  );
  assert.deepEqual(resolved, []);
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

test("catalogAttributeFiltersForSource drops retired offering Type filters", () => {
  const solutions = catalogAttributeFiltersForSource("solutions", {
    serviceType: "TRANSPORT",
    city: "MAKKAH",
    attributeFilters: { offeringType: "TRANSPORT" },
  });
  assert.deepEqual(solutions, {});
  const offerings = catalogAttributeFiltersForSource("services", {
    serviceType: "TRANSPORT",
    attributeFilters: { offeringType: "HOTEL", type: "OTHER" },
  });
  assert.deepEqual(offerings, {});
  const listings = catalogAttributeFiltersForSource("listings", {
    city: "MAKKAH",
    attributeFilters: { offeringType: "TRANSPORT" },
  });
  assert.deepEqual(listings, { city: "MAKKAH" });
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
