import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLocalUploadUrl,
  isSvgMediaUrl,
  normalizeLocalMediaUrl,
  shouldOptimizeNextImage,
} from "../next-image";

describe("normalizeLocalMediaUrl", () => {
  it("keeps root-relative upload paths", () => {
    assert.equal(
      normalizeLocalMediaUrl("/uploads/images/hero.webp"),
      "/uploads/images/hero.webp",
    );
  });

  it("adds leading slash to uploads/ paths", () => {
    assert.equal(
      normalizeLocalMediaUrl("uploads/images/hero.webp"),
      "/uploads/images/hero.webp",
    );
  });

  it("collapses same-origin absolute upload URLs", () => {
    assert.equal(
      normalizeLocalMediaUrl("https://brt-me.net/uploads/images/hero.webp"),
      "/uploads/images/hero.webp",
    );
  });

  it("leaves remote hosts unchanged", () => {
    const url = "https://example.supabase.co/storage/v1/object/public/media/x.webp";
    assert.equal(normalizeLocalMediaUrl(url), url);
  });
});

describe("isSvgMediaUrl", () => {
  it("detects svg paths including local uploads", () => {
    assert.equal(isSvgMediaUrl("/uploads/svg/logo.svg"), true);
    assert.equal(isSvgMediaUrl("https://brt-me.com/uploads/svg/logo.svg"), true);
    assert.equal(isSvgMediaUrl("/uploads/images/logo.webp"), false);
  });
});

describe("shouldOptimizeNextImage", () => {
  it("skips optimizer for svg logos", () => {
    assert.equal(shouldOptimizeNextImage("/uploads/svg/logo.svg"), false);
  });

  it("skips optimizer for local uploads", () => {
    assert.equal(shouldOptimizeNextImage("/uploads/images/hero.webp"), false);
    assert.equal(
      shouldOptimizeNextImage("https://brt-me.net/uploads/images/hero.webp"),
      false,
    );
  });

  it("skips optimizer for getic catalog hosts", () => {
    assert.equal(shouldOptimizeNextImage("https://www.getic.com/foo.jpg"), false);
  });
});

describe("isLocalUploadUrl", () => {
  it("detects relative and absolute local upload URLs", () => {
    assert.equal(isLocalUploadUrl("/uploads/images/a.webp"), true);
    assert.equal(isLocalUploadUrl("https://site.com/uploads/images/a.webp"), true);
    assert.equal(isLocalUploadUrl("https://cdn.example.com/a.webp"), false);
  });
});
