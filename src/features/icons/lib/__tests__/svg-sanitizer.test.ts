import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeUploadedIconSvg } from "../svg-sanitizer";

describe("sanitizeUploadedIconSvg", () => {
  it("rejects <script> tags", () => {
    const raw = `<svg viewBox="0 0 10 10"><script>alert(1)</script><path d="M1 1"/></svg>`;
    assert.equal(sanitizeUploadedIconSvg(raw), null);
  });

  it("rejects event handler attributes (on*)", () => {
    const raw = `<svg viewBox="0 0 10 10" onclick="alert(1)"><path d="M1 1"/></svg>`;
    assert.equal(sanitizeUploadedIconSvg(raw), null);
  });

  it("rejects javascript: href", () => {
    const raw = `<svg viewBox="0 0 10 10"><a href="javascript:alert(1)"><path d="M1 1"/></a></svg>`;
    assert.equal(sanitizeUploadedIconSvg(raw), null);
  });

  it("rejects foreignObject", () => {
    const raw = `<svg viewBox="0 0 10 10"><foreignObject width="10" height="10"></foreignObject></svg>`;
    assert.equal(sanitizeUploadedIconSvg(raw), null);
  });

  it("rejects external references in href/xlink:href/src", () => {
    const raw = `<svg viewBox="0 0 10 10"><use xlink:href="https://example.com/icon.svg#x"/></svg>`;
    assert.equal(sanitizeUploadedIconSvg(raw), null);
  });

  it("accepts a simple safe SVG and extracts viewBox", () => {
    const raw = `<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z" /></svg>`;
    const out = sanitizeUploadedIconSvg(raw);
    assert.ok(out);
    assert.equal(out!.viewBox, "0 0 10 10");
    assert.ok(out!.svgContent.includes("<path"));
  });
});

