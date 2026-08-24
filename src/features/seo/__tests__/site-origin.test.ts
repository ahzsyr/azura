import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { siteUrlToDomain } from "@/features/seo/site-url-utils";

describe("siteUrlToDomain", () => {
  it("extracts hostname from origin URL", () => {
    assert.equal(siteUrlToDomain("https://example.com"), "example.com");
    assert.equal(siteUrlToDomain("https://example.com:443"), "example.com");
  });

  it("falls back to localhost for invalid URLs", () => {
    assert.equal(siteUrlToDomain("not-a-url"), "localhost");
  });
});
