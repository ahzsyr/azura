import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isUsableOgImageUrl, resolveSeoOgImageUrl } from "@/features/seo/seo-image-url";

const SITE = "https://brt-me.com";

describe("resolveSeoOgImageUrl", () => {
  it("keeps external catalog URLs intact", () => {
    const url =
      "https://www.getic.com/images/catalogue/3834/product-medium.jpg";
    assert.equal(resolveSeoOgImageUrl(url, SITE), url);
  });

  it("fixes protocol-relative external URLs", () => {
    assert.equal(
      resolveSeoOgImageUrl("//www.getic.com/images/foo.jpg", SITE),
      "https://www.getic.com/images/foo.jpg",
    );
  });

  it("adds https to bare hostnames", () => {
    assert.equal(
      resolveSeoOgImageUrl("www.getic.com/images/foo.jpg", SITE),
      "https://www.getic.com/images/foo.jpg",
    );
  });

  it("makes local upload paths absolute for OG tags", () => {
    assert.equal(
      resolveSeoOgImageUrl("/uploads/hero.jpg", SITE),
      "https://brt-me.com/uploads/hero.jpg",
    );
  });

  it("normalizes uploads path without leading slash", () => {
    assert.equal(
      resolveSeoOgImageUrl("uploads/hero.jpg", SITE),
      "https://brt-me.com/uploads/hero.jpg",
    );
  });

  it("collapses same-origin absolute URLs to usable absolute form", () => {
    assert.equal(
      resolveSeoOgImageUrl("https://brt-me.com/uploads/hero.jpg", SITE),
      "https://brt-me.com/uploads/hero.jpg",
    );
  });

  it("isUsableOgImageUrl accepts resolved external and local URLs", () => {
    assert.equal(
      isUsableOgImageUrl("//www.getic.com/x.jpg", SITE),
      true,
    );
    assert.equal(isUsableOgImageUrl("/uploads/x.jpg", SITE), true);
    assert.equal(isUsableOgImageUrl("not-a-url", SITE), false);
  });
});
