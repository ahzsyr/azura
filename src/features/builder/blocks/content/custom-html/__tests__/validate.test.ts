import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateElements } from "../validate";
import type { HtmlElement } from "../types";

describe("validateElements", () => {
  it("returns no warnings for valid elements", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "h2", text: "Title", attributes: { id: "title" } },
      { id: "2", tag: "p", text: "Content" },
      { id: "3", tag: "img", attributes: { src: "img.jpg", alt: "Description" } },
    ];
    const warnings = validateElements(elements);
    assert.equal(warnings.length, 0);
  });

  it("warns on duplicate element IDs", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "h2", text: "A", attributes: { id: "same-id" } },
      { id: "2", tag: "h3", text: "B", attributes: { id: "same-id" } },
    ];
    const warnings = validateElements(elements);
    const dupWarning = warnings.find((w) => w.message.includes("Duplicate id"));
    assert.ok(dupWarning);
    assert.equal(dupWarning?.severity, "error");
  });

  it("warns on img missing alt text", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "img", attributes: { src: "img.jpg", alt: "" } },
    ];
    const warnings = validateElements(elements);
    const altWarning = warnings.find((w) => w.message.includes("alt text"));
    assert.ok(altWarning);
    assert.equal(altWarning?.severity, "warning");
  });

  it("warns on figure missing alt text", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "figure", attributes: { src: "img.jpg" }, text: "Caption" },
    ];
    const warnings = validateElements(elements);
    const altWarning = warnings.find((w) => w.tag === "figure");
    assert.ok(altWarning);
  });

  it("warns on link missing href", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "a", text: "Click", attributes: { href: "" } },
    ];
    const warnings = validateElements(elements);
    const hrefWarning = warnings.find((w) => w.message.includes("href"));
    assert.ok(hrefWarning);
  });

  it("does not warn on hidden elements", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "img", attributes: { src: "img.jpg", alt: "" }, hidden: true },
    ];
    const warnings = validateElements(elements);
    const altWarning = warnings.find((w) => w.message.includes("alt text"));
    assert.equal(altWarning, undefined);
  });

  it("does not warn on rawHtml elements", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "img", rawHtml: "<img src='x.jpg'>" },
    ];
    const warnings = validateElements(elements);
    const altWarning = warnings.find((w) => w.message.includes("alt text"));
    assert.equal(altWarning, undefined);
  });

  it("does not warn when li is inside ul", () => {
    const elements: HtmlElement[] = [
      {
        id: "1",
        tag: "ul",
        children: [{ id: "li-1", tag: "li", text: "Item 1" }],
      },
    ];
    const warnings = validateElements(elements);
    const liWarning = warnings.find((w) =>
      w.message.includes("should be inside a ul or ol")
    );
    assert.equal(liWarning, undefined);
  });

  it("warns when li is top-level", () => {
    const elements: HtmlElement[] = [{ id: "li-1", tag: "li", text: "Bad item" }];
    const warnings = validateElements(elements);
    const liWarning = warnings.find((w) =>
      w.message.includes("should be inside a ul or ol")
    );
    assert.ok(liWarning);
  });

  it("returns multiple warnings for multiple issues", () => {
    const elements: HtmlElement[] = [
      { id: "1", tag: "img", attributes: { src: "img.jpg" } },
      { id: "2", tag: "a", text: "link", attributes: { href: "" } },
      { id: "3", tag: "h2", text: "", attributes: { id: "dup" } },
      { id: "4", tag: "h3", text: "other", attributes: { id: "dup" } },
    ];
    const warnings = validateElements(elements);
    assert.ok(warnings.length >= 3);
  });

  // ── Table validation ──────────────────────────────────────────────────────

  it("warns on empty table (no body rows)", () => {
    const elements: HtmlElement[] = [
      {
        id: "t1",
        tag: "table",
        children: [
          { id: "tbody1", tag: "tbody", children: [] },
        ],
      },
    ];
    const warnings = validateElements(elements);
    const w = warnings.find((w) => w.tag === "table" && w.message.includes("no rows"));
    assert.ok(w, "should warn about empty table");
  });

  it("does not warn on table with body rows", () => {
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
                children: [{ id: "td1", tag: "td", text: "Cell" }],
              },
            ],
          },
        ],
      },
    ];
    const warnings = validateElements(elements);
    const emptyW = warnings.find((w) => w.tag === "table" && w.message.includes("no rows"));
    assert.equal(emptyW, undefined);
  });

  it("warns when header row has all empty cells", () => {
    const elements: HtmlElement[] = [
      {
        id: "t1",
        tag: "table",
        children: [
          {
            id: "thead1",
            tag: "thead",
            children: [
              {
                id: "tr-h",
                tag: "tr",
                children: [
                  { id: "th1", tag: "th", text: "" },
                  { id: "th2", tag: "th", text: "" },
                ],
              },
            ],
          },
          {
            id: "tbody1",
            tag: "tbody",
            children: [
              {
                id: "tr1",
                tag: "tr",
                children: [{ id: "td1", tag: "td", text: "Data" }],
              },
            ],
          },
        ],
      },
    ];
    const warnings = validateElements(elements);
    const w = warnings.find((w) => w.message.includes("header row has all empty cells"));
    assert.ok(w);
  });
});
