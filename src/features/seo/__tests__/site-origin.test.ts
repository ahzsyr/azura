import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { siteOriginToDomain } from "@/features/seo/resolve-site-origin";

describe("siteOriginToDomain", () => {
  it("extracts hostname from origin URL", () => {
    assert.equal(siteOriginToDomain("https://example.com"), "example.com");
    assert.equal(siteOriginToDomain("https://example.com:443"), "example.com");
  });

  it("falls back to localhost for invalid URLs", () => {
    assert.equal(siteOriginToDomain("not-a-url"), "localhost");
  });
});
