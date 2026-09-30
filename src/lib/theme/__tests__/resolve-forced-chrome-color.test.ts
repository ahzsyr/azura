import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveForcedChromeColor } from "@/lib/theme/resolve-forced-chrome-color";
import { resolveBrowserProjection } from "@/lib/theme/browser-chrome-projection";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { DEFAULT_DARK_SURFACES } from "@/features/theme/surfaces/theme-surfaces";

describe("resolveForcedChromeColor", () => {
  it("prefers visitor light background in forced light over SSR", () => {
    const color = resolveForcedChromeColor({
      mode: "light",
      visitorColors: {
        primary: "#111",
        accent: "#222",
        background: "#e8f5e9",
      },
      computedBg: "#111111",
      ssrLight: "#fafafa",
      ssrDark: "#020408",
    });
    assert.equal(color, "#e8f5e9");
  });

  it("uses dark default when forced dark and visitor has light background (skip surfaces)", () => {
    const color = resolveForcedChromeColor({
      mode: "dark",
      visitorColors: {
        primary: "#111",
        accent: "#222",
        background: "#fafafa",
      },
      computedBg: "#abcdef",
      ssrLight: "#fafafa",
      ssrDark: "#111111",
    });
    assert.equal(color, DEFAULT_DARK_SURFACES.background);
  });

  it("uses visitor dark background in forced dark", () => {
    const color = resolveForcedChromeColor({
      mode: "dark",
      visitorColors: {
        primary: "#111",
        accent: "#222",
        background: "#0a1628",
      },
      computedBg: "#ffffff",
      ssrDark: "#020408",
    });
    assert.equal(color, "#0a1628");
  });

  it("falls back to computed when no visitor colors", () => {
    const color = resolveForcedChromeColor({
      mode: "light",
      computedBg: "#ccddee",
      ssrLight: "#fafafa",
    });
    assert.equal(color, "#ccddee");
  });

  it("falls back to SSR when no visitor and no computed", () => {
    const color = resolveForcedChromeColor({
      mode: "light",
      ssrLight: "#abcdef",
    });
    assert.equal(color, "#abcdef");
  });
});

describe("site preset SSR projection", () => {
  it("light chrome equals preset light background when syncWithTheme", () => {
    const site = getDefaultThemeTokens();
    site.presetColors = {
      primary: "#6366f1",
      accent: "#8b5cf6",
      background: "#f0fdf4",
      surface: "#ffffff",
      text: "#14532d",
      textMuted: "#166534",
    };
    const projection = resolveBrowserProjection(site);
    assert.equal(projection.themeColorLight, "#f0fdf4");
  });
});
