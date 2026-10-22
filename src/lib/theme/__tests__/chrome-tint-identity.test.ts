import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeBrowserThemeColor,
  resolveBrowserProjection,
} from "@/lib/theme/browser-chrome-projection";
import { buildThemeBootPayload } from "@/lib/theme/theme-boot";
import { resolveForcedChromeColor } from "@/lib/theme/resolve-forced-chrome-color";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import {
  DEFAULT_DARK_SURFACES,
  isLightBackground,
} from "@/features/theme/surfaces/theme-surfaces";
import type { ThemeTokens } from "@/types/theme";
import type { ResolvedAppearance } from "@/features/theme/engine/types";

function siteWithTint(
  source: "surface" | "primary",
  primaryColor = "#d4af37",
): ThemeTokens {
  return {
    ...getDefaultThemeTokens(),
    primaryColor,
    mobileBrowserConfig: {
      syncWithTheme: true,
      chromeTintSource: source,
      browserThemeColorLight: null,
      browserThemeColorDark: null,
      browserBackgroundColor: null,
      iosStatusBarStyle: "black-translucent",
    },
  };
}

/** Mirrors ThemeEngineProvider syncThemeColorForMode baseActiveColor (no scroll). */
function hydrateActiveColor(
  site: ThemeTokens,
  resolved: ResolvedAppearance,
  visitorColors?: Parameters<typeof resolveBrowserProjection>[1],
): string {
  const projection = resolveBrowserProjection(site, visitorColors);
  let base = activeBrowserThemeColor(projection, resolved);
  if (resolved === "dark" && isLightBackground(base)) {
    base = resolveForcedChromeColor({ mode: "dark" });
  }
  return base;
}

describe("chrome tint SSR ≡ boot ≡ hydrate identity", () => {
  for (const source of ["surface", "primary"] as const) {
    for (const resolved of ["light", "dark"] as const) {
      it(`${source} / ${resolved}: SSR projection ≡ boot payload ≡ hydrate active`, () => {
        const site = siteWithTint(source);
        const ssr = resolveBrowserProjection(site);
        const boot = buildThemeBootPayload(ssr).browserProjection;
        assert.equal(boot.themeColorLight, ssr.themeColorLight);
        assert.equal(boot.themeColorDark, ssr.themeColorDark);

        const hydrate = hydrateActiveColor(site, resolved);
        const expected =
          resolved === "dark" ? ssr.themeColorDark : ssr.themeColorLight;
        // After luminance guard, dark must not stay light.
        if (resolved === "dark" && isLightBackground(expected)) {
          assert.equal(hydrate, DEFAULT_DARK_SURFACES.background);
        } else {
          assert.equal(hydrate, expected);
        }
      });
    }
  }

  it("Forced dark luminance guard: omit boot after light projection → DEFAULT_DARK_SURFACES", () => {
    const safe = resolveForcedChromeColor({ mode: "dark" });
    assert.equal(safe, DEFAULT_DARK_SURFACES.background);
  });

  it("legacy skip-surfaces: visitor #fafafa under forced dark → DEFAULT_DARK_SURFACES", () => {
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

  it("primary wash is the hydrate color under Forced light (not raw visitor bg)", () => {
    const site = siteWithTint("primary", "#d4af37");
    const visitor = {
      primary: "#d4af37",
      accent: "#d4af37",
      background: "#e8f5e9",
      surface: "#ffffff",
    };
    const projection = resolveBrowserProjection(site, visitor);
    const hydrate = hydrateActiveColor(site, "light", visitor);
    assert.equal(hydrate, projection.themeColorLight);
    assert.notEqual(hydrate, "#e8f5e9");
  });
});
