import test from "node:test";
import assert from "node:assert/strict";
import {
  contentCollectionPublicPath,
  contentItemPublicPath,
  contentTypeItemsHref,
  contentTypeNewItemHref,
  contentTypePublicPath,
  contentTypeSettingsHref,
  selectContentTypeForPublicSegment,
  slugifyContentTypeName,
} from "@/features/content/content-admin-paths";

test("contentTypePublicPath uses route prefix, then type slug", () => {
  assert.equal(contentTypePublicPath(null), null);
  assert.equal(contentTypePublicPath("  "), null);
  assert.equal(contentTypePublicPath("products"), "/products");
  assert.equal(contentTypePublicPath(null, "solutions"), "/solutions");
  assert.equal(contentTypePublicPath("services", "offerings"), "/services");
});

test("builtin types use canonical public routes even when the DB prefix is stale", () => {
  assert.equal(contentTypePublicPath("hotels-transport", "offerings"), "/services");
  assert.equal(
    contentItemPublicPath("hotels-transport", "offerings", "indoor-coverage"),
    "/services/indoor-coverage",
  );
});

test("an explicit route prefix overrides the builtin canonical route", () => {
  assert.equal(contentTypePublicPath("service", "offerings"), "/service");
  assert.equal(contentItemPublicPath("service", "offerings", "wifi"), "/service/wifi");
});

test("a cleared route prefix publishes at the content type slug", () => {
  assert.equal(contentTypePublicPath(null, "serices"), "/serices");
  assert.equal(contentTypePublicPath("", "serices"), "/serices");
  assert.equal(contentTypePublicPath("   ", "serices"), "/serices");
  assert.equal(contentItemPublicPath(null, "serices", "indoor-coverage"), "/serices/indoor-coverage");
  assert.equal(contentItemPublicPath("", "serices", "indoor-coverage"), "/serices/indoor-coverage");
});

test("public segment lookup falls back to the type slug after the route prefix is cleared", () => {
  const types = [
    { slug: "serices", routePrefix: null },
    { slug: "offerings", routePrefix: "services" },
  ];
  assert.equal(selectContentTypeForPublicSegment("serices", types)?.slug, "serices");
  assert.equal(selectContentTypeForPublicSegment("service", types), undefined);
  assert.equal(
    selectContentTypeForPublicSegment("serices", [{ slug: "serices", routePrefix: "service" }])?.slug,
    "serices",
  );
  assert.equal(
    selectContentTypeForPublicSegment("service", [{ slug: "serices", routePrefix: "service" }])?.slug,
    "serices",
  );
});

test("contentItemPublicPath builds live item URLs without a stored prefix", () => {
  assert.equal(contentItemPublicPath(null, null, "enterprise-wireless"), null);
  assert.equal(
    contentItemPublicPath(null, "solutions", "enterprise-wireless"),
    "/solutions/enterprise-wireless",
  );
  assert.equal(
    contentItemPublicPath("services", "offerings", "managed-wifi"),
    "/services/managed-wifi",
  );
});

test("contentCollectionPublicPath appends the collection query", () => {
  assert.equal(contentCollectionPublicPath(null, "sedans"), null);
  assert.equal(
    contentCollectionPublicPath(null, "featured", "solutions"),
    "/solutions?collection=featured",
  );
  assert.equal(
    contentCollectionPublicPath("vehicles", "off-road"),
    "/vehicles?collection=off-road",
  );
});

test("admin item links stay bound to the content type slug", () => {
  assert.equal(contentTypeItemsHref("products"), "/admin/content/products");
  assert.equal(
    contentTypeItemsHref("products", "featured"),
    "/admin/content/products?collection=featured",
  );
  assert.equal(contentTypeNewItemHref("products"), "/admin/content/products/new");
  assert.equal(contentTypeSettingsHref("abc"), "/admin/content/types/abc");
});

test("slugifyContentTypeName produces a valid type slug", () => {
  assert.equal(slugifyContentTypeName("Vehicles"), "vehicles");
  assert.equal(slugifyContentTypeName("Off-Road Catalog"), "off-road-catalog");
});
