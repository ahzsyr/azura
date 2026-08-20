import assert from "node:assert/strict";
import test from "node:test";
import { resolveProductPageLayoutTemplate } from "@/features/products/lib/resolve-product-page-layout-template";
import { validateTemplateId } from "@/features/products/layout-templates/registry-meta";
import type { Collection } from "@/features/collections/types";
import type { CatalogBrandProfile } from "@/features/catalog/types/catalog-brand-profile";
import type { Product } from "@/features/products/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    productTitle: "Test Product",
    price: { value: 100, currency: "USD" },
    media: { images: [] },
    reviews: { rating: 0, count: 0 },
    ...overrides,
  } as Product;
}

function collection(overrides: Partial<Collection>): Collection {
  return {
    id: overrides.id ?? overrides.slug ?? "c1",
    slug: overrides.slug ?? "wifi",
    name: overrides.name ?? "WiFi",
    description: "",
    conditions: { type: "group", match: "all", children: [] },
    ...overrides,
  };
}

test("validateTemplateId falls back to default for invalid ids", () => {
  assert.equal(validateTemplateId("nonexistent"), "default");
  assert.equal(validateTemplateId(null), "default");
  assert.equal(validateTemplateId(""), "default");
});

test("validateTemplateId accepts registered ids", () => {
  assert.equal(validateTemplateId("unifi"), "unifi");
  assert.equal(validateTemplateId("default"), "default");
});

const brandProfiles: CatalogBrandProfile[] = [
  {
    slug: "ubiquiti",
    name: "Ubiquiti",
    logoUrl: "",
    bannerUrl: "",
    descriptionEn: "",
    descriptionAr: "",
    href: "",
    featured: false,
    sortOrder: 0,
    pageLayoutTemplate: "unifi",
    conditions: { kind: "group", match: "any", children: [] },
  },
];

test("resolveProductPageLayoutTemplate uses product override", () => {
  const result = resolveProductPageLayoutTemplate({
    product: product({ page_layout_template: "default" }),
    site: { productPageLayoutTemplate: "unifi" },
    collections: [collection({ slug: "wifi", pageLayoutTemplate: "unifi" })],
    brandProfiles,
  });
  assert.equal(result.templateId, "default");
  assert.equal(result.assignmentSource, "product");
});

test("resolveProductPageLayoutTemplate uses category override", () => {
  const result = resolveProductPageLayoutTemplate({
    product: product({ categoryIds: ["c-wifi"], categories: ["wifi"] }),
    site: {},
    collections: [
      collection({ id: "c-wifi", slug: "wifi", pageLayoutTemplate: "unifi", sortOrder: 1 }),
    ],
    brandProfiles,
  });
  assert.equal(result.templateId, "unifi");
  assert.equal(result.assignmentSource, "category");
  assert.equal(result.assignmentDetail, "wifi");
});

test("resolveProductPageLayoutTemplate breaks multi-category ties by sortOrder then slug", () => {
  const result = resolveProductPageLayoutTemplate({
    product: product({ categoryIds: ["c-a", "c-b"], categories: ["alpha", "beta"] }),
    site: {},
    collections: [
      collection({ id: "c-b", slug: "beta", pageLayoutTemplate: "default", sortOrder: 0 }),
      collection({ id: "c-a", slug: "alpha", pageLayoutTemplate: "unifi", sortOrder: 0 }),
    ],
    brandProfiles,
  });
  assert.equal(result.templateId, "unifi");
  assert.equal(result.assignmentDetail, "alpha");
});

test("resolveProductPageLayoutTemplate uses brand override", () => {
  const result = resolveProductPageLayoutTemplate({
    product: product({ brand: "Ubiquiti" }),
    site: {},
    collections: [],
    brandProfiles,
  });
  assert.equal(result.templateId, "unifi");
  assert.equal(result.assignmentSource, "brand");
  assert.equal(result.assignmentDetail, "ubiquiti");
});

test("resolveProductPageLayoutTemplate uses site fallback", () => {
  const result = resolveProductPageLayoutTemplate({
    product: product(),
    site: { productPageLayoutTemplate: "unifi" },
    collections: [],
    brandProfiles: [],
  });
  assert.equal(result.templateId, "unifi");
  assert.equal(result.assignmentSource, "site");
});

test("resolveProductPageLayoutTemplate falls back to default when nothing assigned", () => {
  const result = resolveProductPageLayoutTemplate({
    product: product(),
    site: {},
    collections: [],
    brandProfiles: [],
  });
  assert.equal(result.templateId, "default");
  assert.equal(result.assignmentSource, "default");
});

test("resolveProductPageLayoutTemplate falls back to default for invalid stored template id", () => {
  const result = resolveProductPageLayoutTemplate({
    product: product({ page_layout_template: "deleted-layout" }),
    site: {},
    collections: [],
    brandProfiles: [],
  });
  assert.equal(result.templateId, "default");
  assert.equal(result.assignmentSource, "product");
});
