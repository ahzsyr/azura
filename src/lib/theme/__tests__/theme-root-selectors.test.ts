import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { buildThemeTokenCss } from "@/lib/theme/tokens/pipeline";
import {
  THEME_ROOT_DARK_SELECTOR,
  THEME_ROOT_SELECTOR,
  scopeThemeCssToSelector,
} from "@/lib/theme/tokens/theme-root-selectors";

describe("theme root selectors", () => {
  it("emits :root, html so published primary beats globals.css light fallbacks", () => {
    const css = buildThemeTokenCss({
      ...getDefaultThemeTokens(),
      primaryColor: "#9daaff",
      secondaryColor: "#7c3aed",
    });

    assert.ok(css.includes(`${THEME_ROOT_SELECTOR} {`));
    assert.ok(css.includes(`${THEME_ROOT_DARK_SELECTOR} {`));
    assert.ok(css.includes("--primary:#9daaff"));
    assert.ok(css.includes("--accent:#7c3aed"));
    assert.equal(/^html\s*\{/m.test(css), false);
    assert.equal(/^html\.dark\s*\{/m.test(css), false);
  });

  it("scopes published CSS onto a Theme Studio preview root", () => {
    const css = buildThemeTokenCss({
      ...getDefaultThemeTokens(),
      primaryColor: "#9daaff",
      secondaryColor: "#7c3aed",
    });
    const scoped = scopeThemeCssToSelector(css, ".theme-studio-preview-root");

    assert.ok(scoped.includes(".theme-studio-preview-root {"));
    assert.ok(scoped.includes(".theme-studio-preview-root.dark {"));
    assert.equal(scoped.includes(":root, html"), false);
    assert.equal(scoped.includes("html.dark"), false);
    assert.ok(scoped.includes("--primary:#9daaff"));
  });
});
