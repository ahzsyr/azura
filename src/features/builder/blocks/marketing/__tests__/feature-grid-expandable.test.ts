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
  });
});
