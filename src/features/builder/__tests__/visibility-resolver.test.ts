import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateVisibility } from "@/features/builder/visibility/visibility-resolver";

describe("visibility resolver", () => {
  it("allows when no rules", () => {
    assert.equal(evaluateVisibility(undefined, { locale: "en", device: "desktop" }), true);
  });

  it("requires login when loggedIn is true", () => {
    assert.equal(
      evaluateVisibility({ loggedIn: true }, { locale: "en", device: "desktop", isLoggedIn: false }),
      false
    );
    assert.equal(
      evaluateVisibility({ loggedIn: true }, { locale: "en", device: "desktop", isLoggedIn: true }),
      true
    );
  });

  it("filters by locale", () => {
    assert.equal(
      evaluateVisibility({ locales: ["ar"] }, { locale: "en", device: "desktop" }),
      false
    );
  });

  it("matches URL prefix conditions", () => {
    assert.equal(
      evaluateVisibility(
        { urlConditions: [{ match: "prefix", pattern: "/blog" }] },
        { locale: "en", device: "desktop", currentPath: "/blog/post-1" }
      ),
      true
    );
  });
});
