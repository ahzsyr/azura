import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeBrowserThemeColor,
  buildChromeViewport,
  resolveBrowserProjection,
  BROWSER_CHROME_FALLBACK,
  tokensForChromeResolution,
} from "@/lib/theme/browser-chrome-projection";
import { buildThemeState } from "@/lib/theme/theme-state";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";

describe("browser-chrome-projection", () => {
  it("resolveBrowserProjection returns fallback without site theme", () => {
    const p = resolveBrowserProjection(null);
    assert.equal(p.themeColorLight, BROWSER_CHROME_FALLBACK.themeColorLight);
    assert.equal(p.themeColorDark, BROWSER_CHROME_FALLBACK.themeColorDark);
  });

  it("visitor colors override site presetColors for chrome tokens", () => {
    const site = getDefaultThemeTokens();
    const visitor = {
      primary: "#111111",
      accent: "#222222",
      background: "#abcdef",
      surface: "#ffffff",
    };
    const tokens = tokensForChromeResolution(site, visitor);
    assert.ok(tokens);
    assert.equal(tokens!.presetColors?.background, "#abcdef");
    assert.equal(tokens!.primaryColor, "#111111");
    const projection = resolveBrowserProjection(site, visitor);
    assert.equal(typeof projection.themeColorLight, "string");
    assert.ok(projection.themeColorLight.startsWith("#"));
  });

  it("visitor primary drives chromeTintSource primary wash", () => {
    const site = {
      ...getDefaultThemeTokens(),
      primaryColor: "#d4af37",
      mobileBrowserConfig: {
        syncWithTheme: true,
        chromeTintSource: "primary" as const,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "black-translucent" as const,
      },
    };
    const visitor = {
      primary: "#0d9488",
      accent: "#0d9488",
      background: "#fafafa",
      surface: "#ffffff",
    };
    const siteOnly = resolveBrowserProjection(site);
    const withVisitor = resolveBrowserProjection(site, visitor);
    assert.notEqual(
      withVisitor.themeColorLight,
      siteOnly.themeColorLight,
      "visitor teal wash must diverge from site gold wash",
    );
    const tealWash = resolveBrowserProjection(
      { ...site, primaryColor: "#0d9488" },
    );
    assert.equal(
      withVisitor.themeColorLight,
      tealWash.themeColorLight,
      "visitor merge must equal teal primary wash",
    );
  });

  it("activeBrowserThemeColor picks dark vs light", () => {
    const p = BROWSER_CHROME_FALLBACK;
    assert.equal(activeBrowserThemeColor(p, "light"), p.themeColorLight);
    assert.equal(activeBrowserThemeColor(p, "dark"), p.themeColorDark);
  });

  it("exposes appearance-aware glass tint distinct from theme-color", () => {
    const p = BROWSER_CHROME_FALLBACK;
    assert.ok(p.glassTintLight);
    assert.ok(p.glassTintDark);
    assert.notEqual(p.glassTintLight.toLowerCase(), p.themeColorLight.toLowerCase());
  });
});

describe("buildThemeState", () => {
  it("builds versioned state with browser and css projections", () => {
    const site = getDefaultThemeTokens();
    const state = buildThemeState({
      siteTheme: site,
      appearance: "dark",
      version: 3,
    });
    assert.equal(state.appearance, "dark");
    assert.equal(state.resolvedAppearance, "dark");
    assert.equal(state.version, 3);
    assert.equal(state.cssProjection.background, state.surfaces.active.background);
    assert.equal(
      state.browserProjection.themeColorDark,
      resolveBrowserProjection(site).themeColorDark,
    );
  });

  it("keeps viewport-fit cover while edge-to-edge is on and drops it when off", () => {
    const on = buildChromeViewport({
      projection: BROWSER_CHROME_FALLBACK,
      darkModeEnabled: true,
      edgeToEdge: true,
    });
    const off = buildChromeViewport({
      projection: BROWSER_CHROME_FALLBACK,
      darkModeEnabled: true,
      edgeToEdge: false,
    });
    assert.equal(on.viewportFit, "cover");
    assert.equal(off.viewportFit, "auto");
  });
});
