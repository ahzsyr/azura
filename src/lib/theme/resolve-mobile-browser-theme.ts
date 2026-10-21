import type { ThemeTokens } from "@/types/theme";
import type { ChromeTintSource, IosStatusBarStyle } from "@/schemas/theme";
import { resolveThemeSurfaces } from "@/features/theme/surfaces/theme-surfaces";
import { coerceColorString, mixHexColors } from "@/lib/theme/tokens/color-utils";

export type ResolvedMobileBrowserTheme = {
  /** Hex color for browser chrome in light mode (used in theme-color meta). */
  themeColorLight: string;
  /** Hex color for browser chrome in dark mode (used in theme-color meta with media query). */
  themeColorDark: string;
  /** Background color shown while page loads and for PWA manifest background_color. */
  backgroundColor: string;
  /** iOS/Safari status bar appearance style. */
  iosStatusBarStyle: IosStatusBarStyle;
};

/**
 * Resolve effective mobile browser theme values.
 *
 * When `syncWithTheme` is true the colors are derived from the site's resolved
 * surface tokens (optionally washed with the preset primary when
 * `chromeTintSource` is `"primary"`). When false the explicit override values
 * from `mobileBrowserConfig` are used.
 */
const DEFAULT_MOBILE_BROWSER_CONFIG = {
  syncWithTheme: true,
  chromeTintSource: "surface" as ChromeTintSource,
  browserThemeColorLight: null as string | null,
  browserThemeColorDark: null as string | null,
  browserBackgroundColor: null as string | null,
  iosStatusBarStyle: "black-translucent" as IosStatusBarStyle,
};

/**
 * Immersive chrome: published themes often still store "default".
 * Coerce that to black-translucent; keep explicit "black" as solid opt-out.
 */
function resolveIosStatusBarStyle(
  style: IosStatusBarStyle | undefined | null,
): IosStatusBarStyle {
  if (style === "black") return "black";
  if (style === "black-translucent") return "black-translucent";
  // undefined, "default", or any other → immersive translucent
  return "black-translucent";
}

function resolvePrimaryHex(tokens: ThemeTokens): string | null {
  const raw =
    coerceColorString(tokens.primaryColor) ??
    coerceColorString(tokens.presetColors?.primary);
  if (!raw?.startsWith("#")) return null;
  const normalized = raw.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  return `#${normalized.toLowerCase()}`;
}

/**
 * Accent wash strength for solid theme-color hex.
 * When Liquid Glass is on, track glass opacity so chrome matches the material.
 * When glass is off, use a soft brand wash so primary tint still reads.
 */
function resolveChromeAccentWeight(tokens: ThemeTokens): number {
  if (tokens.glassEffectEnabled) {
    const opacity = tokens.glassEffectSettings?.opacity ?? 0.45;
    return Math.min(0.4, Math.max(0.12, opacity * 0.55));
  }
  return 0.2;
}

function applyChromeTintSource(
  surfaceHex: string,
  tokens: ThemeTokens,
  source: ChromeTintSource | undefined,
): string {
  if (source !== "primary") return surfaceHex;
  const primary = resolvePrimaryHex(tokens);
  if (!primary) return surfaceHex;
  return mixHexColors(surfaceHex, primary, resolveChromeAccentWeight(tokens));
}

export function resolveMobileBrowserTheme(tokens: ThemeTokens): ResolvedMobileBrowserTheme {
  const config = tokens.mobileBrowserConfig ?? DEFAULT_MOBILE_BROWSER_CONFIG;

  const presetColors = tokens.presetColors ?? undefined;

  if (!config.syncWithTheme) {
    const lightSurfaces = resolveThemeSurfaces(presetColors, "light", tokens.primaryColor);
    const darkSurfaces = resolveThemeSurfaces(presetColors, "dark", tokens.primaryColor);

    return {
      themeColorLight: config.browserThemeColorLight || lightSurfaces.background,
      themeColorDark: config.browserThemeColorDark || darkSurfaces.background,
      backgroundColor: config.browserBackgroundColor || lightSurfaces.background,
      iosStatusBarStyle: resolveIosStatusBarStyle(config.iosStatusBarStyle),
    };
  }

  // Auto-sync: derive from resolved surface backgrounds, optionally primary-washed.
  const lightSurfaces = resolveThemeSurfaces(presetColors, "light", tokens.primaryColor);
  const darkSurfaces = resolveThemeSurfaces(presetColors, "dark", tokens.primaryColor);
  const tintSource = config.chromeTintSource ?? "surface";

  const themeColorLight = applyChromeTintSource(
    lightSurfaces.background,
    tokens,
    tintSource,
  );
  const themeColorDark = applyChromeTintSource(
    darkSurfaces.background,
    tokens,
    tintSource,
  );

  return {
    themeColorLight,
    themeColorDark,
    backgroundColor: themeColorLight,
    iosStatusBarStyle: resolveIosStatusBarStyle(config.iosStatusBarStyle),
  };
}
