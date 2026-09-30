import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertElementTag,
  getConvertibleTags,
  isConvertibleTag,
} from "../lib/convert-element-tag";
import type { HtmlElement } from "../types";

describe("getConvertibleTags", () => {
  it("returns heading variants for h1", () => {
    const tags = getConvertibleTags("h1");
    assert.ok(tags.includes("h2"));
    assert.ok(tags.includes("p"));
    assert.ok(!tags.includes("h1")); // self excluded
  });

  it("returns ul for ol and vice versa", () => {
    assert.ok(getConvertibleTags("ul").includes("ol"));
    assert.ok(getConvertibleTags("ol").includes("ul"));
  });

  it("returns [] for non-convertible tags", () => {
    assert.deepEqual(getConvertibleTags("img"), []);
    assert.deepEqual(getConvertibleTags("table"), []);
    assert.deepEqual(getConvertibleTags("a"), []);
    assert.deepEqual(getConvertibleTags("br"), []);
  });
});

describe("isConvertibleTag", () => {
  it("is true for headings and text blocks", () => {
    assert.ok(isConvertibleTag("h1"));
    assert.ok(isConvertibleTag("p"));
  });

  it("is false for img, table, br", () => {
    assert.ok(!isConvertibleTag("img"));
    assert.ok(!isConvertibleTag("table"));
    assert.ok(!isConvertibleTag("br"));
  });
});

describe("convertElementTag", () => {
  it("converts h1 to h2 preserving text", () => {
    const el: HtmlElement = { id: "e1", tag: "h1", text: "Hello" };
    const result = convertElementTag(el, "h2");
    assert.equal(result.tag, "h2");
    assert.equal(result.text, "Hello");
    assert.equal(result.id, "e1");
  });

  it("converts ul to ol preserving children", () => {
    const el: HtmlElement = {
      id: "e1",
      tag: "ul",
      children: [{ id: "li1", tag: "li", text: "Item" }],
    };
    const result = convertElementTag(el, "ol");
    assert.equal(result.tag, "ol");
    assert.equal(result.children?.length, 1);
  });

  it("does not convert across groups", () => {
    const el: HtmlElement = { id: "e1", tag: "p", text: "Paragraph" };
    const result = convertElementTag(el, "div");
    assert.equal(result.tag, "p"); // unchanged
  });

  it("does not convert img", () => {
    const el: HtmlElement = { id: "e1", tag: "img", attributes: { src: "a.jpg" } };
    const result = convertElementTag(el, "p" as never);
    assert.equal(result.tag, "img");
  });

  it("preserves attributes on conversion", () => {
    const el: HtmlElement = {
      id: "e1",
      tag: "h2",
      text: "Section",
      attributes: { class: "my-class" },
    };
    const result = convertElementTag(el, "h3");
    assert.equal(result.attributes?.class, "my-class");
  });
});
