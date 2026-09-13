import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sanitizeSharedElementId,
  sharedElementRootAttrs,
  sharedElementViewTransitionName,
} from "@/lib/navigation/shared-elements";

describe("shared-elements", () => {
  it("sanitizes ids for CSS view-transition-name", () => {
    assert.equal(sanitizeSharedElementId("foo/bar"), "foo-bar");
    assert.equal(sanitizeSharedElementId("  "), "item");
    assert.equal(sanitizeSharedElementId(42 as unknown as string), "42");
  });

  it("builds deterministic transition names", () => {
    assert.equal(
      sharedElementViewTransitionName("product", "my-slug", "image"),
      "se-product-image-my-slug",
    );
  });

  it("builds root attrs for navigation handoff", () => {
    assert.deepEqual(sharedElementRootAttrs("product", "abc"), {
      "data-shared-element-root": "",
      "data-shared-element-type": "product",
      "data-shared-element-id": "abc",
    });
  });
});
