import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLlmsDraftFromEntries,
  countLlmsDocument,
  formatLlmsTxt,
  normalizeLlmsDocument,
  parseLlmsTxt,
  sanitizeLlmsDocumentForPublic,
  validateLlmsDocument,
} from "../llms-document";
import type { SeoLlmsConfig } from "../../types";

function document(): SeoLlmsConfig {
  return {
    version: 1,
    enabled: true,
    title: "Acme",
    summary: "Public pages.",
    details: "Details here.",
    sections: [
      {
        id: "s1",
        heading: "Products",
        links: [
          {
            id: "l1",
            title: "Widget",
            url: "https://acme.com/products/widget",
            description: "A widget.",
          },
        ],
      },
      {
        id: "s2",
        heading: "Articles",
        body: "Latest writing.",
        links: [{ id: "l2", title: "Hello", url: "https://acme.com/blog/hello" }],
      },
    ],
  };
}

describe("llms.txt document formatting", () => {
  it("renders title, summary, sections, and links in editor order", () => {
    assert.equal(
      formatLlmsTxt(document()),
      [
        "# Acme",
        "",
        "> Public pages.",
        "",
        "Details here.",
        "",
        "## Products",
        "",
        "- [Widget](https://acme.com/products/widget): A widget.",
        "",
        "## Articles",
        "",
        "Latest writing.",
        "",
        "- [Hello](https://acme.com/blog/hello)",
        "",
      ].join("\n"),
    );
  });

  it("round-trips raw markdown without losing section or link order", () => {
    const formatted = formatLlmsTxt(document());
    const parsed = parseLlmsTxt(formatted);
    assert.deepEqual(parsed.errors, []);
    assert.equal(parsed.document.title, "Acme");
    assert.deepEqual(
      parsed.document.sections.map((section) => section.heading),
      ["Products", "Articles"],
    );
    assert.deepEqual(
      parsed.document.sections.flatMap((section) => section.links.map((link) => link.url)),
      ["https://acme.com/products/widget", "https://acme.com/blog/hello"],
    );
    assert.equal(formatLlmsTxt(parsed.document), formatted);
  });

  it("reports malformed link lines instead of silently dropping them", () => {
    const parsed = parseLlmsTxt("# Acme\n\n## Pages\n\n- [Broken](not a url)\n");
    assert.equal(parsed.errors.length, 1);
    assert.match(parsed.errors[0]!, /Malformed link/);
  });

  it("counts sections, links, and bytes", () => {
    const stats = countLlmsDocument(document());
    assert.equal(stats.sections, 2);
    assert.equal(stats.links, 2);
    assert.ok(stats.bytes > 80);
  });

  it("normalizes legacy/incomplete JSON safely", () => {
    const normalized = normalizeLlmsDocument({ title: "  Acme  ", sections: [{ heading: "Pages" }] });
    assert.equal(normalized.title, "Acme");
    assert.equal(normalized.enabled, true);
    assert.equal(normalized.sections[0]?.heading, "Pages");
    assert.deepEqual(normalized.sections[0]?.links, []);
  });
});

describe("llms.txt validation", () => {
  it("accepts absolute public URLs", () => {
    const result = validateLlmsDocument(document());
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("rejects relative URLs", () => {
    const doc = document();
    doc.sections[0]!.links[0]!.url = "/about";
    const result = validateLlmsDocument(doc);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("absolute http(s) URL")));
  });

  it("rejects private platform paths", () => {
    const doc = document();
    doc.sections[0]!.links[0]!.url = "https://acme.com/admin/pages";
    const result = validateLlmsDocument(doc);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("private")));
  });

  it("warns about duplicate URLs", () => {
    const doc = document();
    doc.sections[1]!.links.push({
      id: "dupe",
      title: "Widget again",
      url: "https://acme.com/products/widget",
    });
    const result = validateLlmsDocument(doc);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((warning) => warning.includes("Duplicate URL")));
  });

  it("removes unsafe links before public serving", () => {
    const doc = document();
    doc.sections[0]!.links.push({
      id: "private",
      title: "Admin",
      url: "https://acme.com/admin",
    });
    const sanitized = sanitizeLlmsDocumentForPublic(doc);
    assert.equal(sanitized.removedLinks, 1);
    assert.equal(
      sanitized.document.sections.flatMap((section) => section.links).length,
      2,
    );
  });
});

describe("llms.txt draft generation", () => {
  const options = {
    origin: "https://acme.com",
    defaultPrefix: "en",
    localePrefixes: ["en", "ar"],
    siteName: "Acme",
    tagline: "Networking products.",
    excludePaths: ["/favorites"],
    noIndexPaths: ["/compare"],
  };

  it("uses absolute canonical URLs, default locale only, and skips private/noindex paths", () => {
    const result = buildLlmsDraftFromEntries(
      [
        { url: "https://acme.com/" },
        { url: "https://acme.com/about" },
        { url: "https://acme.com/ar/about" },
        { url: "https://acme.com/products/widget" },
        { url: "https://acme.com/blog/hello" },
        { url: "https://acme.com/account" },
        { url: "https://acme.com/favorites" },
        { url: "https://acme.com/compare" },
      ],
      options,
    );

    const urls = result.document.sections.flatMap((section) => section.links.map((link) => link.url));
    assert.deepEqual(urls, [
      "https://acme.com/",
      "https://acme.com/about",
      "https://acme.com/products/widget",
      "https://acme.com/blog/hello",
    ]);
    for (const url of urls) {
      assert.match(url, /^https:\/\/acme\.com(\/|$)/);
    }
    assert.deepEqual(
      result.document.sections.map((section) => section.heading),
      ["Pages", "Products", "Articles"],
    );
    assert.equal(result.document.generatedFrom?.entryCount, 4);
  });

  it("omits links and warns when the site origin is unavailable", () => {
    const result = buildLlmsDraftFromEntries(
      [{ url: "https://acme.com/about" }],
      { ...options, origin: null },
    );
    assert.equal(result.document.sections.length, 0);
    assert.ok(result.warnings.some((warning) => warning.includes("origin")));
  });

  it("caps links per section and warns", () => {
    const result = buildLlmsDraftFromEntries(
      [
        { url: "https://acme.com/products/a" },
        { url: "https://acme.com/products/b" },
        { url: "https://acme.com/products/c" },
      ],
      { ...options, maxLinksPerSection: 2 },
    );
    assert.equal(result.document.sections[0]?.links.length, 2);
    assert.ok(result.warnings.some((warning) => warning.includes("capped")));
  });
});
