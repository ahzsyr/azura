import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gscSiteUrlsMatch, normalizeGscSiteUrl, resolveGscSiteUrl } from "../google-gsc-site-url";

describe("google-gsc-site-url", () => {
  it("preserves trailing slash for URL-prefix properties", () => {
    assert.equal(normalizeGscSiteUrl("https://brt-me.com/"), "https://brt-me.com/");
    assert.equal(normalizeGscSiteUrl("  https://brt-me.com/  "), "https://brt-me.com/");
  });

  it("matches URL-prefix properties with or without trailing slash", () => {
    assert.equal(gscSiteUrlsMatch("https://brt-me.com/", "https://brt-me.com"), true);
    assert.equal(gscSiteUrlsMatch("https://www.brt-me.com/", "https://brt-me.com/"), false);
  });

  it("matches domain properties exactly", () => {
    assert.equal(gscSiteUrlsMatch("sc-domain:brt-me.com", "sc-domain:brt-me.com"), true);
    assert.equal(gscSiteUrlsMatch("sc-domain:brt-me.com", "sc-domain:example.com"), false);
  });

  it("matches URL-prefix and domain properties for the same root domain", () => {
    assert.equal(gscSiteUrlsMatch("sc-domain:brt-me.com", "https://brt-me.com/"), true);
    assert.equal(gscSiteUrlsMatch("https://brt-me.com", "sc-domain:brt-me.com"), true);
    assert.equal(gscSiteUrlsMatch("sc-domain:brt-me.com", "https://www.brt-me.com/"), true);
    assert.equal(gscSiteUrlsMatch("sc-domain:brt-me.com", "https://other.com/"), false);
  });

  it("resolves configured site URL against available GSC properties", () => {
    const available = ["https://brt-me.com/", "sc-domain:example.com"];
    assert.equal(resolveGscSiteUrl("https://brt-me.com", available), "https://brt-me.com/");
  });

  it("resolves URL-prefix config to a domain property when needed", () => {
    const available = ["sc-domain:brt-me.com"];
    assert.equal(resolveGscSiteUrl("https://brt-me.com", available), "sc-domain:brt-me.com");
  });

  it("prefers URL-prefix property when both property types exist", () => {
    const available = ["sc-domain:brt-me.com", "https://brt-me.com/"];
    assert.equal(resolveGscSiteUrl("https://brt-me.com", available), "https://brt-me.com/");
  });
});
