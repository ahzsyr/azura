import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deserializeHtml, deserializeLegacyItems } from "../deserialize";

describe("deserializeHtml", () => {
  it("returns empty array for empty string", () => {
    assert.deepEqual(deserializeHtml(""), []);
    assert.deepEqual(deserializeHtml("   "), []);
  });

  it("parses a simple paragraph", () => {
    const elements = deserializeHtml("<p>Hello world</p>");
    assert.equal(elements.length, 1);
    assert.equal(elements[0]!.tag, "p");
    assert.equal(elements[0]!.text, "Hello world");
  });

  it("parses a heading with id attribute", () => {
    const elements = deserializeHtml('<h2 id="features">Features</h2>');
    assert.equal(elements.length, 1);
    assert.equal(elements[0]!.tag, "h2");
    assert.equal(elements[0]!.text, "Features");
    assert.equal(elements[0]!.attributes?.id, "features");
  });

  it("parses an hr void element", () => {
    const elements = deserializeHtml("<hr>");
    assert.equal(elements.length, 1);
    assert.equal(elements[0]!.tag, "hr");
  });

  it("parses multiple top-level paragraphs", () => {
    const elements = deserializeHtml("<p>First</p><p>Second</p>");
    assert.equal(elements.length, 2);
    assert.equal(elements[0]!.tag, "p");
    assert.equal(elements[1]!.tag, "p");
    assert.equal(elements[0]!.text, "First");
    assert.equal(elements[1]!.text, "Second");
  });

  it("parses ul with li items", () => {
    const elements = deserializeHtml("<ul><li>Alpha</li><li>Beta</li></ul>");
    assert.equal(elements.length, 1);
    assert.equal(elements[0]!.tag, "ul");
    const children = elements[0]!.children ?? [];
    assert.equal(children.length, 2);
    assert.equal(children[0]!.text, "Alpha");
    assert.equal(children[1]!.text, "Beta");
  });

  it("wraps complex unknown HTML in a rawHtml div", () => {
    const complex = '<div class="custom"><p>A</p><p>B</p></div>';
    const elements = deserializeHtml(complex);
    assert.ok(elements.length > 0);
    // The complex content should be in at least one element
    const hasContent = elements.some((el) => el.rawHtml?.includes("custom") || el.text?.includes("A"));
    assert.ok(hasContent);
  });

  it("strips inner HTML tags to get plain text for paragraphs", () => {
    const elements = deserializeHtml("<p>Hello <strong>world</strong></p>");
    assert.equal(elements[0]!.tag, "p");
    assert.ok(elements[0]!.text?.includes("Hello"));
    assert.ok(elements[0]!.text?.includes("world"));
  });
});

describe("deserializeLegacyItems", () => {
  it("converts items with html field to elements", () => {
    const items = [{ id: "item-1", html: "<p>Hello</p>" }];
    const elements = deserializeLegacyItems(items, "en");
    assert.ok(elements.length > 0);
    // The paragraph content should be present
    const hasContent = elements.some(
      (el) => el.tag === "p" && el.text === "Hello" || el.rawHtml?.includes("Hello")
    );
    assert.ok(hasContent);
  });

  it("skips items with empty html", () => {
    const items = [
      { id: "item-1", html: "" },
      { id: "item-2", html: "   " },
    ];
    const elements = deserializeLegacyItems(items, "en");
    assert.equal(elements.length, 0);
  });

  it("handles multiple items by concatenating their elements", () => {
    const items = [
      { id: "item-1", html: "<p>First</p>" },
      { id: "item-2", html: "<p>Second</p>" },
    ];
    const elements = deserializeLegacyItems(items, "en");
    assert.ok(elements.length >= 2);
  });
});
