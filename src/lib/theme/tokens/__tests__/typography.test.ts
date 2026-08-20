import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTypographyCss } from "@/lib/theme/tokens/typography";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";

describe("buildTypographyCss", () => {
  it("emits global typography variables", () => {
    const tokens = getDefaultThemeTokens();
    const css = buildTypographyCss(tokens);

    assert.match(css, /--az-font-body:'Plus Jakarta Sans',sans-serif/);
    assert.match(css, /--az-font-display:'Amiri',sans-serif/);
    assert.doesNotMatch(css, /html\[lang/);
  });

  it("emits locale-specific font overrides scoped by locale and lang", () => {
    const tokens = getDefaultThemeTokens();
    tokens.typography = {
      ...tokens.typography,
      localeFonts: {
        ar: { bodyFont: "Cairo", headingFont: "Noto Naskh Arabic", htmlLang: "ar" },
        en: { bodyFont: "Inter", htmlLang: "en-GB" },
      },
    };

    const css = buildTypographyCss(tokens);

    assert.match(css, /html\[data-locale="ar"\]/);
    assert.match(css, /html\[lang="ar"\]/);
    assert.match(css, /html:lang\(ar\)/);
    assert.match(css, /--az-font-body:'Cairo',sans-serif/);
    assert.match(css, /--font-body:'Cairo',sans-serif/);
    assert.match(css, /--az-font-display:'Noto Naskh Arabic',sans-serif/);
    assert.match(css, /html\[data-locale="en"\]/);
    assert.match(css, /html\[lang="en-GB"\]/);
    assert.match(css, /html\[lang="en"\]/);
    assert.match(css, /html:lang\(en-gb\)/);
    assert.match(css, /--az-font-body:'Inter',sans-serif/);
    assert.doesNotMatch(css, /html\[data-locale="en"\][\s\S]*--az-font-display/);
  });

  it("matches locale overrides when html lang casing differs", () => {
    const tokens = getDefaultThemeTokens();
    tokens.typography = {
      ...tokens.typography,
      localeFonts: {
        ar: { bodyFont: "Cairo", htmlLang: "ar-EG" },
      },
    };

    const css = buildTypographyCss(tokens);

    assert.match(css, /html\[lang="ar-EG"\]/);
    assert.match(css, /html\[lang="ar-eg"\]/);
    assert.match(css, /html:lang\(ar-eg\)/);
    assert.match(css, /html\[data-locale="ar"\]/);
  });
});
