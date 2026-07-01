import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTwitterCard,
  sanitizeMetadataAbsoluteUrl,
} from "@/lib/metadata/absolute-url";

describe("sanitizeMetadataAbsoluteUrl", () => {
  const site = "https://brt-me.com";

  it("accepts absolute https URLs", () => {
    assert.equal(
      sanitizeMetadataAbsoluteUrl("https://cdn.example.com/og.jpg", site),
      "https://cdn.example.com/og.jpg",
    );
  });

  it("resolves root-relative paths", () => {
    assert.equal(
      sanitizeMetadataAbsoluteUrl("/uploads/og.jpg", site),
      "https://brt-me.com/uploads/og.jpg",
    );
  });

  it("resolves bare upload paths", () => {
    assert.equal(
      sanitizeMetadataAbsoluteUrl("uploads/og.jpg", site),
      "https://brt-me.com/uploads/og.jpg",
    );
  });

  it("rejects invalid canonical values", () => {
    assert.equal(sanitizeMetadataAbsoluteUrl("not a url", site), undefined);
  });
});

describe("normalizeTwitterCard", () => {
  it("keeps summary", () => {
    assert.equal(normalizeTwitterCard("summary"), "summary");
  });

  it("defaults unknown values to summary_large_image", () => {
    assert.equal(normalizeTwitterCard("invalid"), "summary_large_image");
  });
});
