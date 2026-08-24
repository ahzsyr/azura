import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveMobileBrowserTheme } from "@/lib/theme/resolve-mobile-browser-theme";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import type { ThemeTokens } from "@/types/theme";

function makeTokens(overrides: Partial<ThemeTokens> = {}): ThemeTokens {
  return { ...getDefaultThemeTokens(), ...overrides };
}

describe("resolveMobileBrowserTheme", () => {
  it("returns hex strings for light and dark colors when syncing with theme", () => {
    const tokens = makeTokens({
      mobileBrowserConfig: {
        syncWithTheme: true,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "default",
      },
    });
    const result = resolveMobileBrowserTheme(tokens);
    assert.equal(typeof result.themeColorLight, "string");
    assert.equal(typeof result.themeColorDark, "string");
    assert.equal(typeof result.backgroundColor, "string");
    assert.ok(result.themeColorLight.startsWith("#"), "light color should be hex");
    assert.ok(result.themeColorDark.startsWith("#"), "dark color should be hex");
  });

  it("uses manual override colors when syncWithTheme is false", () => {
    const tokens = makeTokens({
      mobileBrowserConfig: {
        syncWithTheme: false,
        browserThemeColorLight: "#ff0000",
        browserThemeColorDark: "#0000ff",
        browserBackgroundColor: "#00ff00",
        iosStatusBarStyle: "black",
      },
    });
    const result = resolveMobileBrowserTheme(tokens);
    assert.equal(result.themeColorLight, "#ff0000");
    assert.equal(result.themeColorDark, "#0000ff");
    assert.equal(result.backgroundColor, "#00ff00");
    assert.equal(result.iosStatusBarStyle, "black");
  });

  it("falls back to theme surface colors when manual overrides are absent and syncWithTheme is false", () => {
    const tokens = makeTokens({
      mobileBrowserConfig: {
        syncWithTheme: false,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "default",
      },
    });
    const result = resolveMobileBrowserTheme(tokens);
    assert.ok(result.themeColorLight.startsWith("#"), "falls back to surface hex");
    assert.ok(result.themeColorDark.startsWith("#"), "falls back to dark surface hex");
    assert.ok(result.backgroundColor.startsWith("#"), "falls back to bg surface hex");
  });

  it("preserves iosStatusBarStyle from config when syncing", () => {
    const tokens = makeTokens({
      mobileBrowserConfig: {
        syncWithTheme: true,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "black-translucent",
      },
    });
    const result = resolveMobileBrowserTheme(tokens);
    assert.equal(result.iosStatusBarStyle, "black-translucent");
  });

  it("defaults iosStatusBarStyle to default when not specified", () => {
    const tokens = makeTokens({
      mobileBrowserConfig: {
        syncWithTheme: true,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: undefined,
      },
    });
    const result = resolveMobileBrowserTheme(tokens);
    assert.equal(result.iosStatusBarStyle, "default");
  });

  it("light and dark sync colors differ for default theme", () => {
    const tokens = makeTokens({
      mobileBrowserConfig: {
        syncWithTheme: true,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "default",
      },
    });
    const result = resolveMobileBrowserTheme(tokens);
    assert.notEqual(
      result.themeColorLight,
      result.themeColorDark,
      "light and dark surfaces should produce different browser colors",
    );
  });
});
