import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { descriptorFromPageKey, entityKindFromContext } from "../entity-descriptor";

describe("entity descriptor", () => {
  it("maps product pageKey to product kind", () => {
    const d = descriptorFromPageKey("product:my-slug", "en");
    assert.equal(d.kind, "product");
    assert.equal(d.id, "my-slug");
    assert.equal(d.routingKey, "product:my-slug");
  });

  it("maps CmsPage entity type", () => {
    assert.equal(entityKindFromContext("CmsPage"), "cms_page");
  });

  it("maps ContentItem entity type to content_item (not package)", () => {
    assert.equal(entityKindFromContext("ContentItem"), "content_item");
    assert.equal(entityKindFromContext("CONTENT_ITEM"), "content_item");
    assert.equal(entityKindFromContext("content_item"), "content_item");
  });
});
