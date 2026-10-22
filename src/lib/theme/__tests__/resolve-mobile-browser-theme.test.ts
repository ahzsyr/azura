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
        iosStatusBarStyle: "black-translucent",
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
        iosStatusBarStyle: "black-translucent",
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

  it("defaults iosStatusBarStyle to black-translucent when not specified", () => {
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
    assert.equal(result.iosStatusBarStyle, "black-translucent");
  });

  it("keeps an explicit default iosStatusBarStyle", () => {
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
    assert.equal(result.iosStatusBarStyle, "default");
  });

  it("preserves explicit black iosStatusBarStyle as solid opt-out", () => {
    const tokens = makeTokens({
      mobileBrowserConfig: {
        syncWithTheme: true,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "black",
      },
    });
    const result = resolveMobileBrowserTheme(tokens);
    assert.equal(result.iosStatusBarStyle, "black");
  });

  it("light and dark sync colors differ for default theme", () => {
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
    assert.notEqual(
      result.themeColorLight,
      result.themeColorDark,
      "light and dark surfaces should produce different browser colors",
    );
  });

  it("washes preset primary into chrome when chromeTintSource is primary", () => {
    const surface = makeTokens({
      primaryColor: "#047857",
      glassEffectEnabled: false,
      mobileBrowserConfig: {
        syncWithTheme: true,
        chromeTintSource: "surface",
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "black-translucent",
      },
    });
    const primary = makeTokens({
      primaryColor: "#047857",
      glassEffectEnabled: false,
      mobileBrowserConfig: {
        syncWithTheme: true,
        chromeTintSource: "primary",
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "black-translucent",
      },
    });
    const surfaceResult = resolveMobileBrowserTheme(surface);
    const primaryResult = resolveMobileBrowserTheme(primary);
    assert.notEqual(
      primaryResult.themeColorLight,
      surfaceResult.themeColorLight,
      "primary tint should diverge from pure surface",
    );
    assert.ok(primaryResult.themeColorLight.startsWith("#"));
    assert.equal(primaryResult.themeColorLight.length, 7);
  });

  it("mixes primary into the glass sample by glass strength, not Liquid Glass opacity", () => {
    const soft = makeTokens({
      primaryColor: "#047857",
      glassEffectEnabled: true,
      glassEffectSettings: { intensity: 1, opacity: 0.9 },
      mobileBrowserConfig: {
        syncWithTheme: true,
        chromeTintSource: "primary",
        chromeTintStyle: "glass",
        chromeTintGlassOpacity: 0.2,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "black-translucent",
      },
    });
    const strong = makeTokens({
      primaryColor: "#047857",
      glassEffectEnabled: true,
      glassEffectSettings: { intensity: 1, opacity: 0.2 },
      mobileBrowserConfig: {
        syncWithTheme: true,
        chromeTintSource: "primary",
        chromeTintStyle: "glass",
        chromeTintGlassOpacity: 0.9,
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "black-translucent",
      },
    });
    assert.notEqual(
      resolveMobileBrowserTheme(soft).themeColorLight,
      resolveMobileBrowserTheme(strong).themeColorLight,
      "higher glass strength should pull the sample closer to primary",
    );
    assert.equal(resolveMobileBrowserTheme(soft).chromeTintOpacity, 0.2);
    assert.equal(resolveMobileBrowserTheme(strong).chromeTintOpacity, 0.9);
  });

  it("resolves transparent / glass / solid / gradient styles from preset colors", () => {
    const base = {
      syncWithTheme: true as const,
      chromeTintSource: "primary" as const,
      browserThemeColorLight: null,
      browserThemeColorDark: null,
      browserBackgroundColor: null,
      iosStatusBarStyle: "black-translucent" as const,
    };
    const transparent = resolveMobileBrowserTheme(
      makeTokens({
        primaryColor: "#047857",
        secondaryColor: "#d4af37",
        mobileBrowserConfig: {
          ...base,
          chromeTintStyle: "transparent",
          chromeTintOpacity: 0.25,
        },
      }),
    );
    assert.equal(transparent.chromeTintStyle, "transparent");
    assert.equal(transparent.chromeTintOpacity, 0.25);
    assert.equal(transparent.chromeGradientLight, null);
    assert.notEqual(
      transparent.themeColorLight,
      "#047857",
      "transparent samples the page surface, not the brand colour",
    );

    const glass = resolveMobileBrowserTheme(
      makeTokens({
        primaryColor: "#047857",
        mobileBrowserConfig: {
          ...base,
          chromeTintStyle: "glass",
          chromeTintGlassOpacity: 0.7,
        },
      }),
    );
    assert.equal(glass.chromeTintStyle, "glass");
    assert.equal(glass.chromeTintOpacity, 0.7);

    const solid = resolveMobileBrowserTheme(
      makeTokens({
        primaryColor: "#047857",
        mobileBrowserConfig: {
          ...base,
          chromeTintStyle: "solid",
        },
      }),
    );
    assert.equal(solid.chromeTintStyle, "solid");
    assert.equal(solid.chromeTintOpacity, 1);
    assert.equal(solid.themeColorLight, "#047857");

    const gradient = resolveMobileBrowserTheme(
      makeTokens({
        primaryColor: "#047857",
        secondaryColor: "#d4af37",
        mobileBrowserConfig: {
          ...base,
          chromeTintStyle: "gradient",
        },
      }),
    );
    assert.equal(gradient.chromeTintStyle, "gradient");
    assert.equal(gradient.themeColorLight, "#047857");
    assert.ok(gradient.chromeGradientLight?.startsWith("linear-gradient(to bottom, #047857"));
    assert.ok(gradient.chromeGradientLight?.includes("transparent"));
    assert.ok(gradient.chromeGradientDark?.startsWith("linear-gradient(to bottom"));
    assert.notEqual(gradient.themeColorLight, gradient.themeColorDark);

    const surfaceGradient = resolveMobileBrowserTheme(
      makeTokens({
        primaryColor: "#047857",
        mobileBrowserConfig: {
          ...base,
          chromeTintSource: "surface",
          chromeTintStyle: "gradient",
        },
      }),
    );
    assert.notEqual(surfaceGradient.themeColorLight, "#047857");
    assert.ok(surfaceGradient.chromeGradientLight?.includes("transparent"));
  });

  it("does not assign --primary from a chrome style", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const css = readFileSync(join(process.cwd(), "src/styles/edge-to-edge.css"), "utf8");
    const resolver = readFileSync(
      join(process.cwd(), "src/lib/theme/resolve-mobile-browser-theme.ts"),
      "utf8",
    );
    assert.doesNotMatch(css, /--primary\s*:/);
    assert.doesNotMatch(resolver, /--primary\s*:/);
    const before = "#047857";
    const tokens = makeTokens({
      primaryColor: before,
      mobileBrowserConfig: {
        syncWithTheme: true,
        chromeTintSource: "primary",
        chromeTintStyle: "solid",
        browserThemeColorLight: null,
        browserThemeColorDark: null,
        browserBackgroundColor: null,
        iosStatusBarStyle: "black",
      },
    });
    resolveMobileBrowserTheme(tokens);
    assert.equal(tokens.primaryColor, before);
  });
});
