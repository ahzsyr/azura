import assert from "node:assert/strict";
import test from "node:test";

import {
  isProductPublishedForSearch,
  isProductVisibleOnStorefront,
  normalizeProductPublishStatus,
  publishStatusFromProductPayload,
} from "@/features/products/lib/product-publish-status";

test("empty or missing status is treated as published", () => {
  assert.equal(normalizeProductPublishStatus(undefined), "published");
  assert.equal(normalizeProductPublishStatus(null), "published");
  assert.equal(normalizeProductPublishStatus(""), "published");
  assert.equal(normalizeProductPublishStatus("  "), "published");
  assert.equal(isProductPublishedForSearch(undefined), true);
});

test("only published status is public", () => {
  assert.equal(isProductPublishedForSearch("published"), true);
  assert.equal(isProductPublishedForSearch("Published"), true);
  assert.equal(isProductPublishedForSearch("draft"), false);
  assert.equal(isProductPublishedForSearch("archived"), false);
  assert.equal(isProductPublishedForSearch("unpublished"), false);
});

test("storefront hides unpublished products unless includeUnpublished", () => {
  assert.equal(isProductVisibleOnStorefront("draft"), false);
  assert.equal(isProductVisibleOnStorefront("archived"), false);
  assert.equal(isProductVisibleOnStorefront("published"), true);
  assert.equal(isProductVisibleOnStorefront("draft", { includeUnpublished: true }), true);
});

test("publishStatusFromProductPayload reads optional payload status", () => {
  assert.equal(publishStatusFromProductPayload({ status: "draft" }), "draft");
  assert.equal(publishStatusFromProductPayload({}), undefined);
  assert.equal(publishStatusFromProductPayload({ status: 1 }), undefined);
  assert.equal(publishStatusFromProductPayload(null), undefined);
  assert.equal(publishStatusFromProductPayload({ id: "sku-1", name: "Widget" }), undefined);
});
