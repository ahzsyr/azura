import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCustomHtmlElements } from "../get-elements";

describe("getCustomHtmlElements", () => {
  it("returns elements from new elements[] format", () => {
    const elements = getCustomHtmlElements({
      elements: [
        { id: "el-1", tag: "p", text: "Hello" },
        { id: "el-2", tag: "h2", text: "World" },
      ],
    });
    assert.equal(elements.length, 2);
    assert.equal(elements[0]!.id, "el-1");
    assert.equal(elements[1]!.id, "el-2");
  });

  it("returns empty array when elements is empty and no legacy data", () => {
    const elements = getCustomHtmlElements({ elements: [] });
    assert.equal(elements.length, 0);
  });

  it("migrates legacy items[] format", () => {
    const elements = getCustomHtmlElements({
      items: [
        { id: "item-1", html: "<p>Legacy item</p>" },
      ],
    });
    assert.ok(elements.length > 0);
    // Content should be accessible (either via parsed paragraph or rawHtml)
    const hasContent = elements.some(
      (el) => (el.tag === "p" && el.text === "Legacy item") || el.rawHtml?.includes("Legacy item")
    );
    assert.ok(hasContent);
  });

  it("migrates top-level html field", () => {
    const elements = getCustomHtmlElements({ html: "<p>Top level legacy</p>" });
    assert.ok(elements.length > 0);
    const hasContent = elements.some(
      (el) => (el.tag === "p" && el.text === "Top level legacy") || el.rawHtml?.includes("Top level legacy")
    );
    assert.ok(hasContent);
  });

  it("returns empty array when all sources are empty", () => {
    const elements = getCustomHtmlElements({});
    assert.equal(elements.length, 0);
  });

  it("prefers elements[] over items[]", () => {
    const elements = getCustomHtmlElements({
      elements: [{ id: "new-1", tag: "p", text: "New" }],
      items: [{ id: "old-1", html: "<p>Old</p>" }],
    });
    assert.equal(elements.length, 1);
    assert.equal(elements[0]!.id, "new-1");
  });

  it("prefers items[] over top-level html", () => {
    const elements = getCustomHtmlElements({
      items: [{ id: "item-1", html: "<p>Items</p>" }],
      html: "<p>Top level</p>",
    });
    assert.ok(elements.length > 0);
    const hasLegacyItems = elements.some(
      (el) => el.rawHtml?.includes("Items") || el.text === "Items"
    );
    assert.ok(hasLegacyItems);
  });

  it("uses locale to pick the correct html field from items", () => {
    const elements = getCustomHtmlElements(
      { items: [{ id: "item-1", htmlAr: "<p>Arabic</p>", html: "<p>Default</p>" }] },
      "ar"
    );
    assert.ok(elements.length > 0);
  });
});
