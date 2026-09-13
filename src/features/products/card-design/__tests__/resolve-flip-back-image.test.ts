import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveFlipBackImageSrc } from "@/features/products/card-design/resolve-flip-back-image";
import type { ProductListingRecord } from "@/features/products/listing/types";

function product(
  overrides: Partial<ProductListingRecord> = {},
): ProductListingRecord {
  return {
    slug: "test",
    id: "1",
    name: "Test",
    categories: [],
    tags: [],
    price: { amount: 0, currency: "USD" },
    priceMin: 0,
    priceMax: 0,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: [],
    searchText: "",
    ...overrides,
  };
}

describe("resolveFlipBackImageSrc", () => {
  it("returns the second unique gallery URL when available", () => {
    assert.equal(
      resolveFlipBackImageSrc(
        product({
          primary_image: "/a.jpg",
          gallery_images: ["/b.jpg", "/c.jpg"],
        }),
      ),
      "/b.jpg",
    );
  });

  it("falls back to primary when only one image exists", () => {
    assert.equal(
      resolveFlipBackImageSrc(product({ primary_image: "/a.jpg" })),
      "/a.jpg",
    );
  });

  it("deduplicates primary and gallery entries", () => {
    assert.equal(
      resolveFlipBackImageSrc(
        product({
          primary_image: "/a.jpg",
          gallery_images: ["/a.jpg", "/b.jpg"],
        }),
      ),
      "/b.jpg",
    );
  });
});
