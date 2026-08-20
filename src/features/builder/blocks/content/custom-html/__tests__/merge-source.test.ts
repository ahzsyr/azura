import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeSourceElements } from "../lib/merge-source";
import type { HtmlElement } from "../types";

describe("mergeSourceElements", () => {
  it("preserves other-locale text when editing the default locale", () => {
    const existing: HtmlElement[] = [
      { id: "p1", tag: "p", text: "Hello", textEn: "Hello", textAr: "مرحبا" },
    ];
    const parsed: HtmlElement[] = [{ id: "new", tag: "p", text: "Hi there" }];
    const merged = mergeSourceElements(existing, parsed, "en", true);
    assert.equal(merged[0]!.id, "p1");
    assert.equal(merged[0]!.text, "Hi there");
    assert.equal(merged[0]!.textAr, "مرحبا");
  });

  it("writes only locale-suffixed text when editing a non-default locale", () => {
    const existing: HtmlElement[] = [
      { id: "p1", tag: "p", text: "Hello", textEn: "Hello", textAr: "قديم" },
    ];
    const parsed: HtmlElement[] = [{ id: "new", tag: "p", text: "مرحبا" }];
    const merged = mergeSourceElements(existing, parsed, "ar", false);
    assert.equal(merged[0]!.id, "p1");
    assert.equal(merged[0]!.text, "Hello");
    assert.equal(merged[0]!.textAr, "مرحبا");
  });

  it("does not destroy structured elements when non-default parse falls back to rawHtml", () => {
    const existing: HtmlElement[] = [
      {
        id: "t1",
        tag: "table",
        children: [{ id: "td1", tag: "td", text: "Cell", textAr: "خلية" }],
      },
    ];
    const parsed: HtmlElement[] = [{ id: "raw", tag: "div", rawHtml: "<table><td>Cell</td></table>" }];
    const merged = mergeSourceElements(existing, parsed, "ar", false);
    assert.equal(merged[0]!.tag, "table");
    assert.equal(merged[0]!.textAr, undefined);
  });

  it("merges localized alt on matching images", () => {
    const existing: HtmlElement[] = [
      { id: "i1", tag: "img", attributes: { src: "a.jpg", alt: "Cat", altEn: "Cat" } },
    ];
    const parsed: HtmlElement[] = [
      { id: "new", tag: "img", attributes: { src: "a.jpg", alt: "قطة" } },
    ];
    const merged = mergeSourceElements(existing, parsed, "ar", false);
    assert.equal(merged[0]!.attributes?.alt, "Cat");
    assert.equal((merged[0]!.attributes as Record<string, unknown>).altAr, "قطة");
  });
});
