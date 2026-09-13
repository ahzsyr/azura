import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveProductPrimaryImageUrl,
  resolveProductSecondaryImageUrl,
} from "@/features/products/lib/product-primary-image";
import type { Product } from "@/features/products/types";

describe("resolveProductPrimaryImageUrl", () => {
  it("prefers main image type", () => {
    const product = {
      media: {
        images: [
          { url: "https://example.com/gallery.jpg", type: "gallery" as const },
          { url: "https://example.com/main.jpg", type: "main" as const },
        ],
      },
    } satisfies Pick<Product, "media">;
    assert.equal(resolveProductPrimaryImageUrl(product), "https://example.com/main.jpg");
  });

  it("falls back to first image then thumbnails", () => {
    const product = {
      media: {
        images: [],
        thumbnails: [{ url: "https://example.com/thumb.jpg" }],
      },
    } satisfies Pick<Product, "media">;
    assert.equal(resolveProductPrimaryImageUrl(product), "https://example.com/thumb.jpg");
  });
});

describe("resolveProductSecondaryImageUrl", () => {
  it("skips main image type", () => {
    const product = {
      media: {
        images: [
          { url: "https://example.com/main.jpg", type: "main" as const },
          { url: "https://example.com/gallery.jpg", type: "gallery" as const },
        ],
      },
    } satisfies Pick<Product, "media">;
    assert.equal(resolveProductSecondaryImageUrl(product), "https://example.com/gallery.jpg");
  });
});
