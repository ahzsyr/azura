import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  adaptRichTextHtmlColors,
  isThemeNeutralTextColor,
  parseCssColor,
  relativeLuminance,
} from "@/features/builder/blocks/content/lib/adapt-rich-text-colors";

describe("adapt-rich-text-colors", () => {
  it("parses hex and rgb colors", () => {
    assert.deepEqual(parseCssColor("#000"), { r: 0, g: 0, b: 0 });
    assert.deepEqual(parseCssColor("#374151"), { r: 55, g: 65, b: 81 });
    assert.deepEqual(parseCssColor("rgb(51, 51, 51)"), { r: 51, g: 51, b: 51 });
    assert.deepEqual(parseCssColor("black"), { r: 0, g: 0, b: 0 });
  });

  it("treats near-black and gray as theme-neutral", () => {
    assert.equal(isThemeNeutralTextColor("#000000"), true);
    assert.equal(isThemeNeutralTextColor("#374151"), true);
    assert.equal(isThemeNeutralTextColor("rgb(51, 51, 51)"), true);
    assert.equal(isThemeNeutralTextColor("#ffffff"), true);
    assert.equal(isThemeNeutralTextColor("#f8f9fa"), true);
  });

  it("keeps accent colors", () => {
    assert.equal(isThemeNeutralTextColor("#dc2626"), false);
    assert.equal(isThemeNeutralTextColor("#2563eb"), false);
    assert.equal(isThemeNeutralTextColor("var(--foreground)"), false);
  });

  it("strips neutral text color from HTML and keeps accents", () => {
    const html =
      '<p><span style="color: #000000">Body</span> <span style="color: #dc2626">Alert</span></p>';
    const out = adaptRichTextHtmlColors(html);
    assert.match(out, /Body/);
    assert.doesNotMatch(out, /color:\s*#000000/i);
    assert.match(out, /color:\s*#dc2626/i);
  });

  it("removes empty style attributes after stripping", () => {
    const html = '<span style="color: rgb(0, 0, 0)">Hi</span>';
    assert.equal(adaptRichTextHtmlColors(html), "<span>Hi</span>");
  });

  it("preserves other style properties when stripping color", () => {
    const html = '<span style="color: #333333; font-size: 18px">Hi</span>';
    const out = adaptRichTextHtmlColors(html);
    assert.match(out, /font-size:\s*18px/);
    assert.doesNotMatch(out, /color:/i);
  });

  it("reports low luminance for black", () => {
    assert.ok(relativeLuminance({ r: 0, g: 0, b: 0 }) < 0.01);
  });
});
