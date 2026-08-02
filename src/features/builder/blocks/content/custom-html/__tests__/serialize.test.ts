import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serializeElementsToHtml } from "../serialize";
import type { HtmlElement } from "../types";

describe("serializeElementsToHtml", () => {
  it("serializes a simple paragraph", () => {
    const elements: HtmlElement[] = [{ id: "1", tag: "p", text: "Hello world" }];
    assert.equal(serializeElementsToHtml(elements, "en"), "<p>Hello world</p>");
  });

  it("serializes headings with ids", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "h2", text: "Features", attributes: { id: "features" } },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes('<h2 id="features">Features</h2>'));
  });

  it("uses localized text field", () => {
    const el: HtmlElement = { id: "1", tag: "p", text: "Default", textEn: "English" };
    assert.equal(serializeElementsToHtml([el], "en"), "<p>English</p>");
    assert.equal(serializeElementsToHtml([el], "ar"), "<p>Default</p>");
  });

  it("renders rawHtml as-is", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "div", rawHtml: "<p>Raw <strong>content</strong></p>" },
    ];
    assert.equal(serializeElementsToHtml(elements, "en"), "<p>Raw <strong>content</strong></p>");
  });

  it("skips hidden elements", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "p", text: "Visible" },
      { id: "2", tag: "p", text: "Hidden", hidden: true },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes("Visible"));
    assert.ok(!html.includes("Hidden"));
  });

  it("serializes void elements hr and br", () => {
    const elements: HtmlElement[] = [{ id: "1", tag: "hr" }, { id: "2", tag: "br" }];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes("<hr>"));
    assert.ok(html.includes("<br>"));
  });

  it("serializes img with alt and loading", () => {
    const elements: HtmlElement[] = [
      {
        id: "1",
        tag: "img",
        attributes: { src: "https://example.com/img.jpg", alt: "A cat", loading: "lazy" },
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes('src="https://example.com/img.jpg"'));
    assert.ok(html.includes('alt="A cat"'));
    assert.ok(html.includes('loading="lazy"'));
  });

  it("wraps img in anchor when linkHref is set", () => {
    const elements: HtmlElement[] = [
      {
        id: "1",
        tag: "img",
        attributes: { src: "img.jpg", alt: "test", linkHref: "https://example.com", linkTarget: "_blank" },
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes('<a href="https://example.com" target="_blank">'));
    assert.ok(html.includes("<img"));
  });

  it("serializes ul with li children", () => {
    const elements: HtmlElement[] = [
      {
        id: "1",
        tag: "ul",
        children: [
          { id: "a", tag: "li", text: "Item A" },
          { id: "b", tag: "li", text: "Item B" },
        ],
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes("<ul>"));
    assert.ok(html.includes("<li>Item A</li>"));
    assert.ok(html.includes("<li>Item B</li>"));
    assert.ok(html.includes("</ul>"));
  });

  it("serializes figure with img and caption", () => {
    const elements: HtmlElement[] = [
      {
        id: "1",
        tag: "figure",
        text: "A scenic view",
        attributes: { src: "photo.jpg", alt: "Mountains" },
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes("<figure>"));
    assert.ok(html.includes("<img"));
    assert.ok(html.includes("<figcaption>A scenic view</figcaption>"));
    assert.ok(html.includes("</figure>"));
  });

  it("serializes picture with sources", () => {
    const elements: HtmlElement[] = [
      {
        id: "1",
        tag: "picture",
        attributes: {
          src: "fallback.jpg",
          alt: "Test",
          sources: [{ media: "(max-width: 640px)", src: "mobile.jpg" }],
        },
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes("<picture>"));
    assert.ok(html.includes('<source media="(max-width: 640px)"'));
    assert.ok(html.includes("fallback.jpg"));
  });

  it("serializes table structure", () => {
    const elements: HtmlElement[] = [
      {
        id: "1",
        tag: "table",
        children: [
          {
            id: "thead",
            tag: "thead",
            children: [
              {
                id: "tr1",
                tag: "tr",
                children: [{ id: "th1", tag: "th", text: "Name" }],
              },
            ],
          },
          {
            id: "tbody",
            tag: "tbody",
            children: [
              {
                id: "tr2",
                tag: "tr",
                children: [{ id: "td1", tag: "td", text: "Alice" }],
              },
            ],
          },
        ],
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes("<table"));
    assert.ok(html.includes("<thead>"));
    assert.ok(html.includes("<th>Name</th>"));
    assert.ok(html.includes("<td>Alice</td>"));
  });

  it("escapes HTML entities in text", () => {
    const elements: HtmlElement[] = [{ id: "1", tag: "p", text: '<script>alert("xss")</script>' }];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("includes data attributes", () => {
    const elements: HtmlElement[] = [
      {
        id: "1",
        tag: "div",
        attributes: { dataAttributes: { foo: "bar", baz: "qux" } },
        children: [],
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes('data-foo="bar"'));
    assert.ok(html.includes('data-baz="qux"'));
  });

  it("emits dir attribute when set", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "p", text: "Arabic", attributes: { dir: "rtl" } },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes('dir="rtl"'));
  });

  it("emits text-align from style attribute", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "p", text: "Centered", attributes: { style: "text-align: center" } },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes('style="text-align: center"'));
  });

  it("serializes table with colspan and rowspan", () => {
    const elements: HtmlElement[] = [
      {
        id: "t1",
        tag: "table",
        children: [
          {
            id: "tbody1",
            tag: "tbody",
            children: [
              {
                id: "tr1",
                tag: "tr",
                children: [
                  {
                    id: "td1",
                    tag: "td",
                    text: "Merged",
                    attributes: { colspan: 2, rowspan: 2 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes('colspan="2"'));
    assert.ok(html.includes('rowspan="2"'));
    assert.ok(html.includes("Merged"));
  });

  it("serializes table with striped and full-width classes", () => {
    const elements: HtmlElement[] = [
      {
        id: "t1",
        tag: "table",
        attributes: { tableWidth: "full", striped: true },
        children: [
          {
            id: "tbody1",
            tag: "tbody",
            children: [
              {
                id: "tr1",
                tag: "tr",
                children: [{ id: "td1", tag: "td", text: "Cell" }],
              },
            ],
          },
        ],
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes("w-full"));
    assert.ok(html.includes("cb-table-striped"));
  });

  it("serializes table caption", () => {
    const elements: HtmlElement[] = [
      {
        id: "t1",
        tag: "table",
        attributes: { caption: "Table 1: Results" },
        children: [
          {
            id: "tbody1",
            tag: "tbody",
            children: [],
          },
        ],
      },
    ];
    const html = serializeElementsToHtml(elements, "en");
    assert.ok(html.includes("<caption>Table 1: Results</caption>"));
  });
});
