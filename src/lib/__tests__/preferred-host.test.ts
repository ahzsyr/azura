import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  alignUrlToPreferredOrigin,
  buildPreferredHostRedirectUrl,
  parsePreferredSiteUrl,
  resolveWwwApexRedirect,
} from "@/lib/preferred-host";

describe("preferred-host", () => {
  it("parses preferred site URL", () => {
    const parsed = parsePreferredSiteUrl("https://brt-me.com");
    assert.deepEqual(parsed, { origin: "https://brt-me.com", hostname: "brt-me.com" });
    assert.equal(parsePreferredSiteUrl("http://localhost:3000"), null);
  });

  it("redirects www to apex when apex is preferred", () => {
    const redirect = resolveWwwApexRedirect("https://brt-me.com", "www.brt-me.com");
    assert.deepEqual(redirect, {
      fromHost: "www.brt-me.com",
      toOrigin: "https://brt-me.com",
    });
    assert.equal(resolveWwwApexRedirect("https://brt-me.com", "brt-me.com"), null);
  });

  it("redirects apex to www when www is preferred", () => {
    const redirect = resolveWwwApexRedirect("https://www.example.com", "example.com");
    assert.deepEqual(redirect, {
      fromHost: "example.com",
      toOrigin: "https://www.example.com",
    });
  });

  it("builds redirect URL with path and query", () => {
    assert.equal(
      buildPreferredHostRedirectUrl("https://brt-me.com", "/en/products", "?q=1"),
      "https://brt-me.com/en/products?q=1",
    );
  });

  it("aligns www/apex twins onto the preferred origin", () => {
    assert.equal(
      alignUrlToPreferredOrigin(
        "https://brt-me.com/en/products/mikrotik-crs504-4xq-out",
        "https://www.brt-me.com",
      ),
      "https://www.brt-me.com/en/products/mikrotik-crs504-4xq-out",
    );
    assert.equal(
      alignUrlToPreferredOrigin("https://cdn.example.com/key.txt", "https://www.brt-me.com"),
      "https://cdn.example.com/key.txt",
    );
  });
});
