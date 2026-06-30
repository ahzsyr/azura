import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SiteTheme } from "@prisma/client";
import { siteThemeToTokens } from "@/features/theme/theme-config";

function makeTheme(partial: Partial<SiteTheme>): SiteTheme {
  return {
    id: "published",
    preset: "CUSTOM",
    siteDefaultPresetId: null,
    activePresetId: null,
    primaryColor: "#047857",
    secondaryColor: "#d4af37",
    typography: {},
    faviconUrl: null,
    logoUrl: null,
    brandConfig: {},
    headerConfig: {},
    footerConfig: {},
    animationsEnabled: true,
    animationSpeed: 1,
    lazyLoadEnabled: true,
    darkModeEnabled: true,
    spacingScale: 1,
    customCss: null,
    cursorEffect: null,
    backgroundEffect: null,
    textEffect: null,
    cursorEffectEnabled: true,
    backgroundEffectEnabled: true,
    textEffectEnabled: true,
    backgroundEffectSettings: {},
    cardStyle: null,
    borderStyle: null,
    themeProvenance: {},
    updatedAt: new Date(),
    ...partial,
  };
}

describe("siteThemeToTokens preset ownership", () => {
  it("ignores stale legacy activePresetId on read", () => {
    const tokens = siteThemeToTokens(
      makeTheme({ siteDefaultPresetId: "networking", activePresetId: "legacy-travel" }),
    );
    assert.equal(tokens.siteDefaultPresetId, "networking");
    assert.equal(tokens.activePresetId, "networking");
  });

  it("does not promote legacy activePresetId into canonical siteDefaultPresetId", () => {
    const tokens = siteThemeToTokens(
      makeTheme({ siteDefaultPresetId: null, activePresetId: "travel" }),
    );
    assert.equal(tokens.siteDefaultPresetId, null);
    assert.equal(tokens.activePresetId, null);
  });
});
