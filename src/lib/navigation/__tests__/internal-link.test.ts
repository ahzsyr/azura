import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isInternalHref,
  isSameInternalNavTarget,
  normalizeInternalNavHref,
  parseInternalNavTarget,
} from "../internal-link";

describe("normalizeInternalNavHref", () => {
  it("strips locale prefix and preserves query", () => {
    assert.equal(
      normalizeInternalNavHref("/en/products?category=lock"),
      "/products?category=lock",
    );
  });

  it("maps legacy CMS page paths", () => {
    assert.equal(normalizeInternalNavHref("/en/pages/about"), "/about");
  });
});

describe("isSameInternalNavTarget", () => {
  it("treats same path with different query as different targets", () => {
    assert.equal(
      isSameInternalNavTarget("/products", "/products", "?category=lock", "", "https://x.local"),
      false,
    );
  });

  it("treats matching path and query as the same target", () => {
    assert.equal(
      isSameInternalNavTarget(
        "/en/products?category=lock",
        "/products",
        "?category=lock",
        "",
        "https://x.local",
      ),
      true,
    );
  });

  it("normalizes trailing slashes on comparison", () => {
    assert.equal(
      isSameInternalNavTarget("/products/", "/products", "", "", "https://x.local"),
      true,
    );
  });
});

describe("parseInternalNavTarget", () => {
  it("returns locale-neutral path parts", () => {
    assert.deepEqual(parseInternalNavTarget("/en/products?category=lock"), {
      path: "/products",
      search: "?category=lock",
      hash: "",
    });
  });
});

// ---------------------------------------------------------------------------
// isInternalHref — NavLink / Link vs <a> selection rules
// ---------------------------------------------------------------------------

describe("isInternalHref", () => {
  // truthy cases — should render next-intl Link (soft nav)
  it("treats root-relative paths as internal", () => {
    assert.equal(isInternalHref("/products"), true);
  });

  it("treats locale-prefixed root-relative paths as internal", () => {
    assert.equal(isInternalHref("/en/products"), true);
  });

  it("treats root-relative paths with query as internal", () => {
    assert.equal(isInternalHref("/categories/bags?sort=price"), true);
  });

  it("treats the bare root slash as internal", () => {
    assert.equal(isInternalHref("/"), true);
  });

  it("treats root-relative paths with a hash fragment as internal", () => {
    assert.equal(isInternalHref("/about#team"), true);
  });

  // falsy cases — should stay as hard-nav <a>
  it("treats bare hash href as external/hash (keep <a>)", () => {
    assert.equal(isInternalHref("#"), false);
  });

  it("treats hash-only hrefs as external/hash (keep <a>)", () => {
    assert.equal(isInternalHref("#section"), false);
  });

  it("treats mailto: URIs as external (keep <a>)", () => {
    assert.equal(isInternalHref("mailto:hello@example.com"), false);
  });

  it("treats tel: URIs as external (keep <a>)", () => {
    assert.equal(isInternalHref("tel:+1234567890"), false);
  });

  it("treats http:// URLs as external (keep <a>)", () => {
    assert.equal(isInternalHref("http://example.com/page"), false);
  });

  it("treats https:// URLs as external (keep <a>)", () => {
    assert.equal(isInternalHref("https://example.com/page"), false);
  });

  it("treats null as external (keep <a>)", () => {
    assert.equal(isInternalHref(null), false);
  });

  it("treats undefined as external (keep <a>)", () => {
    assert.equal(isInternalHref(undefined), false);
  });

  it("treats empty string as external (keep <a>)", () => {
    assert.equal(isInternalHref(""), false);
  });
});
