import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const visualCssPath = path.join(process.cwd(), "src/styles/visual-enhancements.css");
const layoutCssPath = path.join(process.cwd(), "src/features/layout-engine/layout-engine.css");

describe("hero live-render CSS contract", () => {
  it("unclips BlockWrapper when hero needs shell breakout", async () => {
    const css = await readFile(visualCssPath, "utf8");
    assert.match(
      css,
      /\[data-block-type="hero"\]\[data-hero-shell-breakout="true"\]/,
    );
    assert.match(
      css,
      /\[data-block-type="videoHero"\]\[data-hero-shell-breakout="true"\]/,
    );
    assert.match(css, /overflow:\s*visible/);
  });

  it("breaks full-bleed and overlay heroes out of boxed layout shells", async () => {
    const css = await readFile(layoutCssPath, "utf8");
    assert.match(
      css,
      /\.az-layout-shell:not\(\[data-max-width="full"\]\) \[data-hero-layout="fullBleed"\]/,
    );
    assert.match(
      css,
      /\.block-first-with-header-overlay\[data-hero-layout\]:not\(\[data-hero-layout\*="split"\]\)/,
    );
  });
});
