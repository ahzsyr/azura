import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { customHtmlPropsSchema } from "@/features/builder/blocks/content/schemas/content-blocks";
import { getCustomHtmlItems } from "@/features/builder/blocks/content/lib/custom-html-items";

describe("customHtmlPropsSchema", () => {
  it("parses empty defaults", () => {
    const parsed = customHtmlPropsSchema.parse({});
    assert.ok(Array.isArray(parsed.elements));
    assert.equal(parsed.elements.length, 0);
  });

  it("parses elements array", () => {
    const parsed = customHtmlPropsSchema.parse({
      elements: [
        { id: "el-1", tag: "p", text: "Hello" },
        { id: "el-2", tag: "h2", text: "World", hidden: true },
      ],
    });
    assert.equal(parsed.elements.length, 2);
  });

  it("preserves passthrough fields on the props object", () => {
    const parsed = customHtmlPropsSchema.parse({
      elements: [],
      extraField: "value",
    } as unknown as Parameters<typeof customHtmlPropsSchema.parse>[0]);
    assert.equal((parsed as Record<string, unknown>).extraField, "value");
  });
});

// getCustomHtmlItems is the legacy helper still used during migration —
// ensure it still functions correctly for backward compat reads.
describe("getCustomHtmlItems (legacy)", () => {
  it("returns items array when present", () => {
    const items = getCustomHtmlItems({
      items: [
        { id: "chi-1", html: "<p>A</p>" },
        { id: "chi-2", html: "<p>B</p>" },
      ],
    });
    assert.equal(items.length, 2);
    assert.equal(items[0]!.id, "chi-1");
  });

  it("wraps legacy top-level html into a single item", () => {
    const items = getCustomHtmlItems({ html: "<p>legacy</p>" });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.id, "legacy");
    assert.equal(items[0]!.html, "<p>legacy</p>");
  });

  it("wraps legacy locale-suffixed html fields", () => {
    const items = getCustomHtmlItems({ htmlEn: "<p>en</p>", htmlAr: "<p>ar</p>" });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.id, "legacy");
    assert.equal((items[0] as Record<string, unknown>).htmlEn, "<p>en</p>");
    assert.equal((items[0] as Record<string, unknown>).htmlAr, "<p>ar</p>");
  });

  it("returns empty array when no html data", () => {
    const items = getCustomHtmlItems({});
    assert.equal(items.length, 0);
  });

  it("prefers items array over legacy top-level html", () => {
    const items = getCustomHtmlItems({
      html: "<p>legacy</p>",
      items: [{ id: "chi-1", html: "<p>new</p>" }],
    });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.id, "chi-1");
  });

  it("falls back to legacy when items array is empty", () => {
    const items = getCustomHtmlItems({ html: "<p>legacy</p>", items: [] });
    assert.equal(items.length, 1);
    assert.equal(items[0]!.id, "legacy");
  });
});
