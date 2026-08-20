import test from "node:test";
import assert from "node:assert/strict";
import {
  contentCollectionPublicPath,
  contentItemPublicPath,
  contentTypeItemsHref,
  contentTypeNewItemHref,
  contentTypePublicPath,
  contentTypeSettingsHref,
  slugifyContentTypeName,
} from "@/features/content/content-admin-paths";

test("contentTypePublicPath uses route prefix, then type slug", () => {
  assert.equal(contentTypePublicPath(null), null);
  assert.equal(contentTypePublicPath("  "), null);
  assert.equal(contentTypePublicPath("products"), "/products");
  assert.equal(contentTypePublicPath(null, "solutions"), "/solutions");
  assert.equal(contentTypePublicPath("services", "offerings"), "/services");
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
