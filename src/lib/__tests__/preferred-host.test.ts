import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  alignUrlToPreferredOrigin,
  buildPreferredHostRedirectUrl,
  forceApexOrigin,
  parsePreferredApexSiteUrl,
  parsePreferredSiteUrl,
  resolveWwwApexRedirect,
  violatesSeoApexUrlInvariants,
} from "@/lib/preferred-host";

describe("preferred-host", () => {
  it("parses preferred site URL", () => {
    const parsed = parsePreferredSiteUrl("https://brt-me.com");
    assert.deepEqual(parsed, { origin: "https://brt-me.com", hostname: "brt-me.com" });
    assert.equal(parsePreferredSiteUrl("http://localhost:3000"), null);
  });

  it("forces apex origin from www and http", () => {
    assert.equal(forceApexOrigin("https://www.brt-me.com"), "https://brt-me.com");
    assert.equal(forceApexOrigin("http://www.brt-me.com/"), "https://brt-me.com");
    assert.equal(forceApexOrigin("https://brt-me.com"), "https://brt-me.com");
  });

  it("parsePreferredApexSiteUrl strips www", () => {
    assert.deepEqual(parsePreferredApexSiteUrl("https://www.brt-me.com"), {
      origin: "https://brt-me.com",
      hostname: "brt-me.com",
    });
  });

  it("redirects www to apex when apex is preferred", () => {
    const redirect = resolveWwwApexRedirect("https://brt-me.com", "www.brt-me.com");
    assert.deepEqual(redirect, {
      fromHost: "www.brt-me.com",
      toOrigin: "https://brt-me.com",
    });
    assert.equal(resolveWwwApexRedirect("https://brt-me.com", "brt-me.com"), null);
  });

  it("builds redirect URL with path and query", () => {
    assert.equal(
      buildPreferredHostRedirectUrl("https://brt-me.com", "/en/products", "?q=1"),
      "https://brt-me.com/en/products?q=1",
    );
  });

  it("aligns www twins onto apex preferred origin", () => {
    assert.equal(
      alignUrlToPreferredOrigin(
        "https://www.brt-me.com/en/products/mikrotik-crs504-4xq-out",
        "https://brt-me.com",
      ),
      "https://brt-me.com/en/products/mikrotik-crs504-4xq-out",
    );
    assert.equal(
      alignUrlToPreferredOrigin(
        "https://www.brt-me.com/about",
        "https://www.brt-me.com",
      ),
      "https://brt-me.com/about",
    );
    assert.equal(
      alignUrlToPreferredOrigin("https://cdn.example.com/key.txt", "https://brt-me.com"),
      "https://cdn.example.com/key.txt",
    );
  });

  it("detects SEO apex invariant violations", () => {
    assert.equal(violatesSeoApexUrlInvariants("https://brt-me.com/"), null);
    assert.equal(violatesSeoApexUrlInvariants("https://brt-me.com/about"), null);
    assert.equal(violatesSeoApexUrlInvariants("https://www.brt-me.com/"), "www_host");
    assert.equal(violatesSeoApexUrlInvariants("http://brt-me.com/"), "http_scheme");
    assert.equal(violatesSeoApexUrlInvariants("https://brt-me.com/en"), "default_locale_prefix");
    assert.equal(violatesSeoApexUrlInvariants("https://brt-me.com/en/about"), "default_locale_prefix");
    assert.equal(violatesSeoApexUrlInvariants("https://brt-me.com/ar/about"), null);
  });
});
