import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import type { EntityRecord } from "@/features/entities/types";
import { mapEntityRecordToListingRecord } from "@/resolvers/product/map-entity-to-listing";

describe("mapEntityRecordToListingRecord", () => {
  it("maps entity fields to a listing record", () => {
    const entity: EntityRecord = {
      ref: {
        presetId: "product",
        storage: "product",
        id: "entity-42",
        slug: "travel-pack",
      },
      title: "Travel Pack",
      excerpt: "Compact travel pack",
      thumbnailUrl: "https://cdn.example/pack.jpg",
      collectionSlug: "bags",
      fields: {
        brand: "Safar",
        categories: ["Accessories"],
        tags: ["featured"],
        price: { value: 49, currency: "USD" },
        stock_status: "in_stock",
      },
    };

    const listing = mapEntityRecordToListingRecord(entity);
    assert.equal(listing.slug, "travel-pack");
    assert.equal(listing.id, "entity-42");
    assert.equal(listing.name, "Travel Pack");
    assert.equal(listing.price.value, 49);
    assert.equal(listing.primary_image, "https://cdn.example/pack.jpg");
    assert.deepEqual(listing.collectionSlugs, ["bags"]);
  });

  it("strips locale prefix consistently with card hrefs", () => {
    assert.equal(stripAnyLocalePrefix("/en/products/foo"), "/products/foo");
  });
});
