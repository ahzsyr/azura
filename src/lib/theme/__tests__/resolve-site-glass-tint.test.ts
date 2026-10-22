import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeSiteGlassTint,
  resolveSiteGlassTintPair,
} from "@/lib/theme/resolve-site-glass-tint";
import {
  DEFAULT_DARK_SURFACES,
  DEFAULT_LIGHT_SURFACES,
  isLightBackground,
} from "@/features/theme/surfaces/theme-surfaces";
import {
  activeBrowserGlassTint,
  resolveBrowserProjection,
} from "@/lib/theme/browser-chrome-projection";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";

describe("resolveSiteGlassTintPair", () => {
  it("returns surface-role colours distinct from default page canvas", () => {
    const pair = resolveSiteGlassTintPair();
    assert.equal(pair.light, DEFAULT_LIGHT_SURFACES.surface);
    assert.equal(pair.dark, DEFAULT_DARK_SURFACES.surface);
    assert.notEqual(pair.light.toLowerCase(), DEFAULT_LIGHT_SURFACES.background.toLowerCase());
    assert.notEqual(pair.dark.toLowerCase(), DEFAULT_DARK_SURFACES.background.toLowerCase());
  });

  it("locks luminance: light stays light, dark stays dark", () => {
    const pair = resolveSiteGlassTintPair({
      primary: "#111",
      background: "#f8fafc",
      surface: "#f8fafc",
    });
    assert.ok(isLightBackground(pair.light));
    assert.ok(!isLightBackground(pair.dark));
  });

  it("activeSiteGlassTint follows appearance", () => {
    const pair = resolveSiteGlassTintPair();
    assert.equal(activeSiteGlassTint(pair, "light"), pair.light);
    assert.equal(activeSiteGlassTint(pair, "dark"), pair.dark);
  });
});

describe("projection glass tint vs theme-color", () => {
  it("glass tint is not the same identity as themeColor / background", () => {
    const projection = resolveBrowserProjection(getDefaultThemeTokens());
    assert.ok(projection.glassTintLight);
    assert.ok(projection.glassTintDark);
    assert.notEqual(
      projection.glassTintLight.toLowerCase(),
      projection.themeColorLight.toLowerCase(),
    );
    assert.ok(!isLightBackground(projection.glassTintDark));
    assert.equal(activeBrowserGlassTint(projection, "dark"), projection.glassTintDark);
    assert.equal(activeBrowserGlassTint(projection, "light"), projection.glassTintLight);
  });
});
