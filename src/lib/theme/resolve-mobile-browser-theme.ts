import type { ThemeTokens } from "@/types/theme";
import type {
  ChromeTintSource,
  ChromeTintStyle,
  IosStatusBarStyle,
} from "@/schemas/theme";
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
  /** Material style for header/footer/browser chrome CSS. */
  chromeTintStyle: ChromeTintStyle;
  /**
   * Which colour the chrome is derived from: `surface` (page surface) or
   * `primary` (preset main colour washed into the surface).
   */
  chromeTintSource: ChromeTintSource;
  /**
   * Effective fill strength 0–1 written to `--az-chrome-tint-opacity`.
   * Transparent → chromeTintOpacity; glass → chromeTintGlassOpacity; solid/gradient → 1.
   */
  chromeTintOpacity: number;
  /** CSS linear-gradient for light appearance (gradient style only). */
  chromeGradientLight: string | null;
  /** CSS linear-gradient for dark appearance (gradient style only). */
  chromeGradientDark: string | null;
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
  chromeTintStyle: "glass" as ChromeTintStyle,
  chromeTintOpacity: 0.35,
  chromeTintGlassOpacity: 0.7,
  browserThemeColorLight: null as string | null,
  browserThemeColorDark: null as string | null,
  browserBackgroundColor: null as string | null,
  iosStatusBarStyle: "black-translucent" as IosStatusBarStyle,
};

/**
 * Keep an explicit studio choice. Only a missing value falls back to
 * black-translucent (older rows that never stored a style).
 */
function resolveIosStatusBarStyle(
  style: IosStatusBarStyle | undefined | null,
): IosStatusBarStyle {
  if (style === "black" || style === "default" || style === "black-translucent") {
    return style;
  }
  return "black-translucent";
}

function clampUnit(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
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

/** Colour the bar and the opaque sample are derived from, before style mixing. */
function resolveChromeBasis(
  surfaceHex: string,
  tokens: ThemeTokens,
  source: ChromeTintSource | undefined,
  style: ChromeTintStyle,
): string {
  if (source !== "primary") return surfaceHex;
  const primary = resolvePrimaryHex(tokens);
  if (!primary) return surfaceHex;
  // Solid and glass use the preset primary. Transparent samples the page
  // surface (themeColorForStyle). Gradient uses its own top stop.
  if (style === "solid" || style === "glass") return primary;
  return surfaceHex;
}

/**
 * Top of the vertical fade. Light primary is the preset colour. Dark primary
 * is that colour washed into the dark surface so the sample is not neon.
 * Surface basis is the page background in either appearance.
 */
function resolveGradientTop(
  surfaceHex: string,
  tokens: ThemeTokens,
  source: ChromeTintSource | undefined,
  dark: boolean,
): string {
  if (source !== "primary") return surfaceHex;
  const primary = resolvePrimaryHex(tokens);
  if (!primary) return surfaceHex;
  return dark ? mixHexColors(surfaceHex, primary, 0.55) : primary;
}

function buildVerticalFade(top: string): string {
  return `linear-gradient(to bottom, ${top} 0%, transparent 100%)`;
}

function resolveStyleOpacity(
  style: ChromeTintStyle,
  config: {
    chromeTintOpacity?: number;
    chromeTintGlassOpacity?: number;
  },
): number {
  if (style === "transparent") {
    return clampUnit(config.chromeTintOpacity, 0.35);
  }
  if (style === "glass") {
    return clampUnit(config.chromeTintGlassOpacity, 0.7);
  }
  return 1;
}

/**
 * OS `theme-color` cannot be translucent or a gradient. Map style → opaque hex
 * that approximates the chrome the user will see.
 */
function themeColorForStyle(
  style: ChromeTintStyle,
  tintHex: string,
  surfaceHex: string,
  opacity: number,
  gradientTop: string | null,
): string {
  if (style === "transparent") {
    // Page shows through — the opaque sample is the page surface.
    return surfaceHex;
  }
  if (style === "gradient") {
    // Safari cannot paint the fade. Sample the fade's top stop, not a midpoint.
    return gradientTop ?? tintHex;
  }
  if (style === "glass") {
    // Opaque stand-in for the frosted fill: basis mixed over the page surface.
    return mixHexColors(surfaceHex, tintHex, opacity);
  }
  return tintHex;
}

export function resolveMobileBrowserTheme(tokens: ThemeTokens): ResolvedMobileBrowserTheme {
  const config = tokens.mobileBrowserConfig ?? DEFAULT_MOBILE_BROWSER_CONFIG;
  const style = (config.chromeTintStyle ?? "glass") as ChromeTintStyle;
  const opacity = resolveStyleOpacity(style, config);
  const iosStatusBarStyle = resolveIosStatusBarStyle(config.iosStatusBarStyle);

  const presetColors = tokens.presetColors ?? undefined;
  const lightSurfaces = resolveThemeSurfaces(presetColors, "light", tokens.primaryColor);
  const darkSurfaces = resolveThemeSurfaces(presetColors, "dark", tokens.primaryColor);

  if (!config.syncWithTheme) {
    const light =
      config.browserThemeColorLight || lightSurfaces.background;
    const dark = config.browserThemeColorDark || darkSurfaces.background;
    return {
      themeColorLight: light,
      themeColorDark: dark,
      backgroundColor: config.browserBackgroundColor || lightSurfaces.background,
      iosStatusBarStyle,
      chromeTintStyle: style,
      chromeTintSource: config.chromeTintSource ?? "surface",
      chromeTintOpacity: opacity,
      chromeGradientLight: null,
      chromeGradientDark: null,
    };
  }

  const tintSource = config.chromeTintSource ?? "surface";
  const tintLight = resolveChromeBasis(
    lightSurfaces.background,
    tokens,
    tintSource,
    style,
  );
  const tintDark = resolveChromeBasis(
    darkSurfaces.background,
    tokens,
    tintSource,
    style,
  );

  const gradTopLight =
    style === "gradient"
      ? resolveGradientTop(lightSurfaces.background, tokens, tintSource, false)
      : null;
  const gradTopDark =
    style === "gradient"
      ? resolveGradientTop(darkSurfaces.background, tokens, tintSource, true)
      : null;

  const chromeGradientLight = gradTopLight ? buildVerticalFade(gradTopLight) : null;
  const chromeGradientDark = gradTopDark ? buildVerticalFade(gradTopDark) : null;

  const themeColorLight = themeColorForStyle(
    style,
    tintLight,
    lightSurfaces.background,
    opacity,
    gradTopLight,
  );
  const themeColorDark = themeColorForStyle(
    style,
    tintDark,
    darkSurfaces.background,
    opacity,
    gradTopDark,
  );

  return {
    themeColorLight,
    themeColorDark,
    backgroundColor: themeColorLight,
    iosStatusBarStyle,
    chromeTintStyle: style,
    chromeTintSource: tintSource,
    chromeTintOpacity: opacity,
    chromeGradientLight,
    chromeGradientDark,
  };
}
