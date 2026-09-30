import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFooterConfig, parseHeaderConfig } from "@/features/theme/theme-config";
import {
  chromePathMatches,
  isChromeVisible,
  normalizeChromePath,
} from "@/lib/theme/chrome-visibility";

describe("parseHeaderConfig chrome visibility", () => {
  it("defaults to enabled on all pages for legacy configs", () => {
    const parsed = parseHeaderConfig({ showLogo: true });
    assert.equal(parsed.enabled, true);
    assert.equal(parsed.visibilityMode, "all");
    assert.deepEqual(parsed.pagePaths, []);
  });

  it("reads enabled false and selected page paths", () => {
    const parsed = parseHeaderConfig({
      enabled: false,
      visibilityMode: "selected",
      pagePaths: ["/about", 12, "/contact"],
    });
    assert.equal(parsed.enabled, false);
    assert.equal(parsed.visibilityMode, "selected");
    assert.deepEqual(parsed.pagePaths, ["/about", "/contact"]);
  });
});

describe("parseFooterConfig chrome visibility", () => {
  it("defaults to enabled on all pages", () => {
    const parsed = parseFooterConfig({});
    assert.equal(parsed.enabled, true);
    assert.equal(parsed.visibilityMode, "all");
  });
});

describe("chrome visibility matching", () => {
  it("normalizes trailing slashes and empty home paths", () => {
    assert.equal(normalizeChromePath("/about/"), "/about");
    assert.equal(normalizeChromePath(""), "/");
    assert.equal(normalizeChromePath("/"), "/");
  });

  it("matches exact paths and [slug] patterns", () => {
    assert.equal(chromePathMatches("/about", "/about/"), true);
    assert.equal(chromePathMatches("/products/[slug]", "/products/router"), true);
    assert.equal(chromePathMatches("/products/[slug]", "/products"), false);
    assert.equal(chromePathMatches("/products/[slug]", "/products/a/b"), false);
  });

  it("hides chrome when disabled globally", () => {
    assert.equal(isChromeVisible({ enabled: false }, "/about"), false);
  });

  it("shows chrome on all pages by default", () => {
    assert.equal(isChromeVisible(undefined, "/about"), true);
    assert.equal(isChromeVisible({ enabled: true, visibilityMode: "all" }, "/about"), true);
  });

  it("treats selected mode with no pages as visible everywhere", () => {
    assert.equal(
      isChromeVisible({ enabled: true, visibilityMode: "selected", pagePaths: [] }, "/about"),
      true,
    );
  });

  it("shows chrome only on selected pages", () => {
    const settings = {
      enabled: true,
      visibilityMode: "selected" as const,
      pagePaths: ["/about", "/products/[slug]"],
    };
    assert.equal(isChromeVisible(settings, "/about"), true);
    assert.equal(isChromeVisible(settings, "/products/router"), true);
    assert.equal(isChromeVisible(settings, "/contact"), false);
  });

  it("hides chrome on except pages", () => {
    const settings = {
      enabled: true,
      visibilityMode: "except" as const,
      pagePaths: ["/account"],
    };
    assert.equal(isChromeVisible(settings, "/account"), false);
    assert.equal(isChromeVisible(settings, "/about"), true);
  });
});
