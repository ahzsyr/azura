import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseContentListBlockProps } from "@/features/content/schemas/content-list-block";
import { resolvePresetFromBlockProps } from "@/templates/preset-template-map";

describe("content-list-block schema", () => {
  it("defaults content type slug and derives preset", () => {
    const parsed = parseContentListBlockProps({});
    assert.equal(parsed.contentTypeSlug, "catalog-items");
    assert.equal(resolvePresetFromBlockProps(parsed), "destination");
  });

  it("accepts explicit preset and template ids", () => {
    const parsed = parseContentListBlockProps({
      presetId: "service",
      templateId: "service-card",
      contentTypeSlug: "offerings",
    });
    assert.equal(parsed.presetId, "service");
    assert.equal(parsed.templateId, "service-card");
  });
});
