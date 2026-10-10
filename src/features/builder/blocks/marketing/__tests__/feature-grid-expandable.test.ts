import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  estimateFeatureGridLineClamp,
  normalizeFeatureGridProps,
  resolveFeatureGridDescriptionHtml,
} from "@/features/builder/blocks/marketing/lib/normalize-feature-grid";

describe("feature grid expandable helpers", () => {
  it("estimates line clamps from preview modes", () => {
    assert.equal(estimateFeatureGridLineClamp("lines", 4), 4);
    assert.equal(estimateFeatureGridLineClamp("words", 25), 3);
    assert.equal(estimateFeatureGridLineClamp("characters", 120), 2);
  });

  it("resolves plain description to html when descriptionHtml is empty", () => {
    const html = resolveFeatureGridDescriptionHtml(
      { id: "1", description: "Hello", descriptionHtml: "" },
      "en"
    );
    assert.equal(html, "<p>Hello</p>");
  });

  it("prefers descriptionHtml over plain description", () => {
    const html = resolveFeatureGridDescriptionHtml(
      {
        id: "1",
        description: "Plain",
        descriptionHtml: "<p>Rich</p><ul><li>A</li></ul>",
      },
      "en"
    );
    assert.ok(html.includes("<ul>"));
    assert.ok(!html.includes("Plain"));
  });

  it("defaults expand on with view-more labels for new props", () => {
    const props = normalizeFeatureGridProps({
      title: "Features",
      cardVariant: "default",
      items: [{ id: "1", title: "A", description: "B" }],
    });
    assert.equal(props.expandEnabled, true);
    assert.equal(props.expandMode, "inline");
    assert.equal(props.readMoreLabel, "View more");
    assert.equal(props.readLessLabel, "View less");
    assert.equal(props.layout, "standard");
    assert.equal(props.presentation, "grid");
    assert.equal(props.cardPresentation, "standard");
    assert.equal(props.carouselShowNav, true);
    assert.equal(props.carouselShowDots, false);
    assert.equal(props.carouselAutoplay, false);
    assert.equal(props.expandHideWhenFooterLink, true);
    assert.equal(props.accordionAllowMultiple, false);
    assert.equal(props.accordionOpenFirst, true);
  });

  it("maps legacy layout values onto presentation and card presentation", () => {
    const carousel = normalizeFeatureGridProps({ layout: "carousel", items: [] });
    assert.equal(carousel.presentation, "carousel");
    assert.equal(carousel.cardPresentation, "standard");

    const numbered = normalizeFeatureGridProps({ layout: "numbered", items: [] });
    assert.equal(numbered.presentation, "grid");
    assert.equal(numbered.cardPresentation, "numbered");

    const iconTop = normalizeFeatureGridProps({ cardVariant: "iconTop", items: [] });
    assert.equal(iconTop.layout, "icon");
    assert.equal(iconTop.presentation, "grid");
    assert.equal(iconTop.cardPresentation, "icon");
  });

  it("keeps an explicit presentation when an older layout value is also present", () => {
    const props = normalizeFeatureGridProps({
      layout: "icon",
      presentation: "accordion",
      cardPresentation: "horizontal",
      items: [],
    });
    assert.equal(props.presentation, "accordion");
    assert.equal(props.cardPresentation, "horizontal");
    assert.equal(props.layout, "icon");
  });

  it("prefers localized html, then stored content, then plain text", () => {
    const html = resolveFeatureGridDescriptionHtml(
      {
        id: "1",
        description: "Plain",
        descriptionContent: "<p>Stored</p>",
        descriptionHtml: "<p>Html</p>",
      },
      "en"
    );
    assert.equal(html, "<p>Html</p>");

    const fromContent = resolveFeatureGridDescriptionHtml(
      {
        id: "1",
        description: "Plain",
        descriptionHtml: "",
        descriptionContent: "<p>Stored</p>",
      },
      "en"
    );
    assert.equal(fromContent, "<p>Stored</p>");

    const fromJson = resolveFeatureGridDescriptionHtml(
      {
        id: "1",
        description: "Plain",
        descriptionHtml: "",
        descriptionContent: JSON.stringify({
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "From json" }] }],
        }),
      },
      "en"
    );
    assert.match(fromJson, /From json/);
    assert.doesNotMatch(fromJson, /Plain/);
  });
});
