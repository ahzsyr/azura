import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeCustomHtml } from "../sanitize";

describe("sanitizeCustomHtml", () => {
  it("passes through clean allowed tags", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    assert.equal(sanitizeCustomHtml(html), html);
  });

  it("strips <script> tags entirely", () => {
    const html = '<p>Safe</p><script>alert("xss")</script>';
    const out = sanitizeCustomHtml(html);
    assert.ok(!out.includes("<script>"));
    assert.ok(!out.includes("alert"));
    assert.ok(out.includes("<p>Safe</p>"));
  });

  it("strips <iframe> tags", () => {
    const html = '<iframe src="https://evil.com"></iframe><p>after</p>';
    const out = sanitizeCustomHtml(html);
    assert.ok(!out.includes("iframe"));
    assert.ok(out.includes("<p>after</p>"));
  });

  it("strips on* event handlers from tags", () => {
    const html = '<div onclick="evil()" onmouseover="evil()">text</div>';
    const out = sanitizeCustomHtml(html);
    assert.ok(!out.includes("onclick"));
    assert.ok(!out.includes("onmouseover"));
    assert.ok(out.includes("<div>"));
  });

  it("strips javascript: hrefs", () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const out = sanitizeCustomHtml(html);
    assert.ok(!out.includes("javascript:"));
    assert.ok(out.includes("<a"));
    assert.ok(out.includes("click"));
  });

  it("strips <form>, <input>, <select> tags", () => {
    const html = "<form><input type='text'><select></select></form>";
    const out = sanitizeCustomHtml(html);
    assert.ok(!out.includes("form"));
    assert.ok(!out.includes("input"));
    assert.ok(!out.includes("select"));
  });

  it("allows safe img attributes", () => {
    const html = '<img src="photo.jpg" alt="A photo" loading="lazy" width="800" height="600">';
    const out = sanitizeCustomHtml(html);
    assert.ok(out.includes('src="photo.jpg"'));
    assert.ok(out.includes('alt="A photo"'));
    assert.ok(out.includes('loading="lazy"'));
  });

  it("allows data-* attributes", () => {
    const html = '<div data-track="click" data-id="123">text</div>';
    const out = sanitizeCustomHtml(html);
    assert.ok(out.includes('data-track="click"'));
    assert.ok(out.includes('data-id="123"'));
  });

  it("allows aria- attributes on allowed elements", () => {
    const html = '<div aria-label="Close" aria-expanded="false">X</div>';
    const out = sanitizeCustomHtml(html);
    assert.ok(out.includes('aria-label="Close"'));
    assert.ok(out.includes('aria-expanded="false"'));
  });

  it("returns empty string for empty input", () => {
    assert.equal(sanitizeCustomHtml(""), "");
    assert.equal(sanitizeCustomHtml("   "), "");
  });

  it("allows allowed semantic layout tags", () => {
    const html = "<section><article><aside>test</aside></article></section>";
    const out = sanitizeCustomHtml(html);
    assert.ok(out.includes("<section>"));
    assert.ok(out.includes("<article>"));
    assert.ok(out.includes("<aside>"));
  });
});
