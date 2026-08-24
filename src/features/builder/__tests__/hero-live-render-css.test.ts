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

  it("mirrors sidebar columns in RTL with named areas, not track-list-only overrides", async () => {
    const css = await readFile(layoutCssPath, "utf8");
    assert.match(css, /grid-template-areas:\s*"asideStart primary"/);
    assert.match(css, /\[dir="rtl"\][\s\S]*left-sidebar[\s\S]*grid-template-areas:\s*"primary asideStart"/);
    assert.match(css, /\[dir="rtl"\][\s\S]*right-sidebar[\s\S]*grid-template-areas:\s*"asideEnd primary"/);
    assert.match(css, /\[dir="rtl"\][\s\S]*three-column[\s\S]*grid-template-areas:\s*"asideEnd primary asideStart"/);
    assert.match(css, /\[dir="rtl"\][\s\S]*split[\s\S]*grid-template-areas:\s*"asideEnd asideStart"/);
  });
});
