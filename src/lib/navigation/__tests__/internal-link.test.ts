import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
