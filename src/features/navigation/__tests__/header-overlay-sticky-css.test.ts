import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const cssPath = path.join(
  process.cwd(),
  "src/features/navigation/components/header/header-builder.css"
);

describe("header sticky overlay CSS guards", () => {
  it("keeps sticky glass reinforcement disabled for overlay headers", async () => {
    const css = await readFile(cssPath, "utf8");
    const stickySelector =
      /html:not\(:has\(\[data-page-header-overlay="true"\]\)\) \.header-root\[data-header-desktop="sticky"\]:not\(\[data-block-header-overlay="true"\]\):not\(\[data-header-overlay="true"\]\)\.header--sticking \.site-header/;
    const shrinkSelector =
      /html:not\(:has\(\[data-page-header-overlay="true"\]\)\) \.header-root\[data-header-desktop="shrink-scroll"\]:not\(\[data-block-header-overlay="true"\]\):not\(\[data-header-overlay="true"\]\)\.header--sticking \.site-header/;
    const darkStickySelector =
      /\.dark:not\(:has\(\[data-page-header-overlay="true"\]\)\) \.header-root\[data-header-desktop="sticky"\]:not\(\[data-block-header-overlay="true"\]\):not\(\[data-header-overlay="true"\]\)\.header--sticking \.site-header/;
    const darkShrinkSelector =
      /\.dark:not\(:has\(\[data-page-header-overlay="true"\]\)\) \.header-root\[data-header-desktop="shrink-scroll"\]:not\(\[data-block-header-overlay="true"\]\):not\(\[data-header-overlay="true"\]\)\.header--sticking \.site-header/;

    assert.match(css, stickySelector);
    assert.match(css, shrinkSelector);
    assert.match(css, darkStickySelector);
    assert.match(css, darkShrinkSelector);
  });
});
