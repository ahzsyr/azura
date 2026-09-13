import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { publicLocalePath, switchLocalePath } from "@/i18n/url-helpers";

const DEFAULT = "en";

describe("legacy /en public URL mapping", () => {
  it("maps legacy English paths to unprefixed equivalents", () => {
    assert.equal(publicLocalePath("en", "/", DEFAULT), "/");
    assert.equal(publicLocalePath("en", "/about", DEFAULT), "/about");
    assert.equal(publicLocalePath("en", "/products/test", DEFAULT), "/products/test");
  });
});

describe("locale switching public URLs", () => {
  it("produces / for English from Arabic home", () => {
    assert.equal(switchLocalePath("/ar", "ar", "en", ["en", "ar"]), "/");
    assert.equal(switchLocalePath("/ar/about", "ar", "en", ["en", "ar"]), "/about");
  });
});
