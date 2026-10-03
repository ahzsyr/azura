import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const cssPath = path.join(
  process.cwd(),
  "src/features/navigation/components/header/header-builder.css"
);

describe("header sticky overlay CSS guards", () => {
  it("keeps sticky glass reinforcement guarded for non-overlay headers", async () => {
    const css = await readFile(cssPath, "utf8");
    const stickySelector =
      /\.header-root\[data-header-desktop="sticky"\]:not\(\[data-block-header-overlay="true"\]\):not\(\[data-header-overlay="true"\]\)\.header--sticking \.site-header/;
    const shrinkSelector =
      /\.header-root\[data-header-desktop="shrink-scroll"\]:not\(\[data-block-header-overlay="true"\]\):not\(\[data-header-overlay="true"\]\)\.header--sticking \.site-header/;
    const darkStickySelector =
      /\.dark \.header-root\[data-header-desktop="sticky"\]:not\(\[data-block-header-overlay="true"\]\):not\(\[data-header-overlay="true"\]\)\.header--sticking \.site-header/;
    const darkShrinkSelector =
      /\.dark \.header-root\[data-header-desktop="shrink-scroll"\]:not\(\[data-block-header-overlay="true"\]\):not\(\[data-header-overlay="true"\]\)\.header--sticking \.site-header/;

    assert.match(css, stickySelector);
    assert.match(css, shrinkSelector);
    assert.match(css, darkStickySelector);
    assert.match(css, darkShrinkSelector);
  });

  it("re-applies first-block overlay surfaces while sticky", async () => {
    const css = await readFile(cssPath, "utf8");
    const transparentSticky =
      /\.header-root\[data-block-header-overlay="true"\]\.header--sticking\[data-overlay-surface="transparent"\] \.site-header/;
    const glassSticky =
      /\.header-root\[data-block-header-overlay="true"\]\.header--sticking\[data-overlay-surface="glass"\] \.site-header/;
    const solidSticky =
      /\.header-root\[data-block-header-overlay="true"\]\.header--sticking\[data-overlay-surface="solid"\] \.site-header/;

    assert.match(css, transparentSticky);
    assert.match(css, glassSticky);
    assert.match(css, solidSticky);
  });

  it("supports opt-in mobile boxed sticky and flush-top controls", async () => {
    const css = await readFile(cssPath, "utf8");
    assert.match(
      css,
      /\.header-root\[data-mobile-boxed-sticky="true"\]\.header-style-boxed-compact \.site-header/
    );
    assert.match(
      css,
      /data-mobile-boxed-sticky="true"[\s\S]{0,400}width:\s*calc\(100% - 24px\)/
    );
    assert.match(css, /\.header-root\[data-mobile-flush-top="true"\] \.site-header/);
    assert.match(
      css,
      /\.header-root\[data-mobile-flush-top="true"\]\.header-style-boxed-compact \.site-header/
    );
    assert.match(css, /html:has\(\.header-root\[data-mobile-flush-top="false"\]\)/);
  });

  it("compacts shrink-on-scroll headers including tagline and logo", async () => {
    const css = await readFile(cssPath, "utf8");
    assert.match(
      css,
      /\.header-root\[data-header-desktop="shrink-scroll"\] \{\s*position:\s*sticky;/
    );
    assert.match(
      css,
      /@media \(max-width: 968px\) \{[\s\S]*?\[data-header-desktop="shrink-scroll"\] \{\s*align-items:\s*stretch;/
    );
    assert.match(css, /min-height:\s*var\(--header-shell-height/);
    assert.match(
      css,
      /\.header-root\[data-header-desktop="shrink-scroll"\]\.header--shrunk \.brand-tagline/
    );
    assert.match(
      css,
      /\.header-root\[data-header-desktop="shrink-scroll"\]\.header--shrunk \.nav-container/
    );
    assert.match(
      css,
      /\.header-root\[data-header-desktop="shrink-scroll"\]\.header--shrunk \.brand-logo \.brand-logo-tint/
    );
    assert.match(
      css,
      /\.header-root\[data-block-header-overlay="true"\],\s*\.header-root\[data-header-overlay="true"\]/
    );
  });

  it("gives brand logos an explicit height before shrink-on-scroll", async () => {
    const css = await readFile(cssPath, "utf8");
    // Mask/SVG logos collapse with height:auto; sizing mode must set height up front.
    assert.match(
      css,
      /\[data-logo-sizing-mode="fixed"\][\s\S]*?\.brand-logo-tint__sizer \{\s*max-height:\s*var\(--brand-logo-h-mobile,\s*40px\);\s*height:\s*var\(--brand-logo-h-mobile,\s*40px\);/
    );
    assert.match(
      css,
      /\[data-logo-sizing-mode="fixed"\][\s\S]*?\.brand-logo-tint__sizer \{\s*max-height:\s*var\(--brand-logo-h-desktop,\s*48px\);\s*height:\s*var\(--brand-logo-h-desktop,\s*48px\);/
    );
    assert.match(
      css,
      /\.header-root\[data-header-desktop="shrink-scroll"\]\.header--shrunk \.brand-logo \.brand-logo-tint[\s\S]*?height:\s*calc\(var\(--brand-logo-h-desktop,\s*48px\) \* 0\.72\)/
    );
  });
});
