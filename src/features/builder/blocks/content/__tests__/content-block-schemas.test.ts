import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  advancedRichTextPropsSchema,
  changelogPropsSchema,
  codePropsSchema,
  markdownPropsSchema,
  tablePropsSchema,
  timelinePropsSchema,
  comparisonPropsSchema,
} from "@/features/builder/blocks/content/schemas/content-blocks";

describe("content block schemas", () => {
  it("parses markdown defaults", () => {
    const parsed = markdownPropsSchema.parse({});
    assert.equal(parsed.prose, true);
    assert.equal(parsed.allowGfm, true);
  });

  it("parses code defaults", () => {
    const parsed = codePropsSchema.parse({});
    assert.equal(parsed.language, "typescript");
    assert.equal(parsed.showCopyButton, true);
  });

  it("parses table defaults", () => {
    const parsed = tablePropsSchema.parse({});
    assert.equal(parsed.features.sortable, true);
    assert.equal(Array.isArray(parsed.columns), true);
  });

  it("parses timeline defaults", () => {
    const parsed = timelinePropsSchema.parse({});
    assert.equal(parsed.layout, "vertical");
  });

  it("parses changelog defaults", () => {
    const parsed = changelogPropsSchema.parse({});
    assert.equal(Array.isArray(parsed.releases), true);
    assert.equal(parsed.layout, "timeline");
    assert.equal(parsed.releaseSetSlug, "");
  });

  it("parses comparison defaults", () => {
    const parsed = comparisonPropsSchema.parse({});
    assert.equal(parsed.source, "manual");
    assert.equal(parsed.highlightDifferences, true);
  });

  it("parses advancedRichText defaults", () => {
    const parsed = advancedRichTextPropsSchema.parse({});
    assert.equal(parsed.maxWidth, "reading");
    assert.equal(parsed.prose, true);
    assert.equal(Array.isArray(parsed.sections), true);
    assert.equal(parsed.sections.length, 0);
  });

  it("parses advancedRichText with sections", () => {
    const parsed = advancedRichTextPropsSchema.parse({
      sections: [
        { id: "rts-1", contentEn: '{"type":"doc"}', htmlEn: "<p>Hello</p>" },
        { id: "rts-2", contentEn: '{"type":"doc"}', htmlEn: "<p>World</p>" },
      ],
      maxWidth: "contained",
      prose: false,
    });
    assert.equal(parsed.sections.length, 2);
    assert.equal((parsed.sections[0] as Record<string, unknown>).id, "rts-1");
    assert.equal(parsed.maxWidth, "contained");
    assert.equal(parsed.prose, false);
  });

  it("parses advancedRichText preserving legacy top-level fields", () => {
    const parsed = advancedRichTextPropsSchema.parse({
      contentEn: '{"type":"doc"}',
      htmlEn: "<p>Legacy content</p>",
      maxWidth: "reading",
      prose: true,
    });
    assert.equal(parsed.sections.length, 0);
    assert.equal((parsed as Record<string, unknown>).htmlEn, "<p>Legacy content</p>");
  });
});
