import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeCustomHtml,
  sanitizeHtml,
  unwrapNestedAnchors,
  hoistInvalidParagraphBlocks,
} from "@/lib/sanitize-html";

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

  it("demotes nested document landmarks to div (React #418)", () => {
    const html = "<main class='x'><header>H</header><nav>N</nav><footer>F</footer></main>";
    const out = sanitizeCustomHtml(html);
    assert.ok(!out.includes("<main"));
    assert.ok(!out.includes("<header"));
    assert.ok(!out.includes("<nav"));
    assert.ok(!out.includes("<footer"));
    assert.ok(out.includes("<div"));
    assert.ok(out.includes(">H<"));
    assert.ok(out.includes(">N<"));
    assert.ok(out.includes(">F<"));
  });

  it("keeps safe text-align styles for public rendering", () => {
    const html = '<p style="text-align: center">Centered</p>';
    const out = sanitizeCustomHtml(html);
    assert.ok(out.includes("text-align"));
    assert.ok(out.includes("center"));
  });

  it("strips unsafe CSS from style attributes", () => {
    const html = '<p style="text-align: right; background: url(javascript:alert(1))">x</p>';
    const out = sanitizeCustomHtml(html);
    assert.ok(out.includes("text-align"));
    assert.ok(!out.includes("url("));
    assert.ok(!out.includes("javascript"));
  });

  it("unwraps nested anchors — outer link wins (React #418)", () => {
    const html = '<a href="/outer">Go <a href="/inner">deeper</a> now</a>';
    const out = sanitizeHtml(html);
    assert.match(out, /href="\/outer"/);
    assert.doesNotMatch(out, /href="\/inner"/);
    assert.match(out, /<span[^>]*>deeper<\/span>/);
    assert.doesNotMatch(out, /<a[^>]*>[\s\S]*<a[\s>]/i);
  });

  it("warns in development when nested anchors are unwrapped", () => {
    const warnings: unknown[][] = [];
    const restore = mock.method(console, "warn", (...args: unknown[]) => {
      warnings.push(args);
    });
    try {
      unwrapNestedAnchors('<a href="/o">x <a href="/i">y</a></a>');
      assert.ok(
        warnings.some(
          (args) =>
            typeof args[0] === "string" &&
            String(args[0]).includes("nested <a> unwrapped"),
        ),
        `expected DEV warning, got ${JSON.stringify(warnings)}`,
      );
    } finally {
      restore.mock.restore();
    }
  });

  it("hoists block children out of <p>", () => {
    const html = "<p>Intro <div>block</div> tail</p>";
    const out = hoistInvalidParagraphBlocks(html);
    assert.ok(out.includes("<div>block</div>"), out);
    assert.doesNotMatch(out, /<p>[^<]*<div/i);
  });

  it("does not rewrite valid sibling <p> + <ul>", () => {
    const html = "<p>Intro</p><ul><li>A</li></ul>";
    const out = hoistInvalidParagraphBlocks(html);
    assert.equal(out, html);
    assert.equal(sanitizeHtml(html), html);
  });
});
