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

function resolveSecondaryHex(tokens: ThemeTokens): string | null {
  const raw =
    coerceColorString(tokens.secondaryColor) ??
    coerceColorString(tokens.presetColors?.secondary) ??
    coerceColorString(tokens.presetColors?.accent) ??
    resolvePrimaryHex(tokens);
  if (!raw?.startsWith("#")) return null;
  const normalized = raw.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  return `#${normalized.toLowerCase()}`;
}

/**
 * Accent wash strength for glass/transparent primary tint.
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
  style: ChromeTintStyle,
): string {
  if (source !== "primary") return surfaceHex;
  const primary = resolvePrimaryHex(tokens);
  if (!primary) return surfaceHex;
  // Solid primary = full brand; glass/transparent/gradient wash into surface.
  if (style === "solid") return primary;
  return mixHexColors(surfaceHex, primary, resolveChromeAccentWeight(tokens));
}

function buildPresetGradient(from: string, to: string): string {
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
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
  gradientMid: string | null,
): string {
  if (style === "transparent") {
    // Page shows through — status bar samples the page surface.
    return surfaceHex;
  }
  if (style === "gradient") {
    return gradientMid ?? tintHex;
  }
  if (style === "glass") {
    // Approximate frosted fill as tint mixed over the page surface.
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
      chromeTintOpacity: opacity,
      chromeGradientLight: null,
      chromeGradientDark: null,
    };
  }

  const tintSource = config.chromeTintSource ?? "surface";
  const tintLight = applyChromeTintSource(
    lightSurfaces.background,
    tokens,
    tintSource,
    style,
  );
  const tintDark = applyChromeTintSource(
    darkSurfaces.background,
    tokens,
    tintSource,
    style,
  );

  const primary = resolvePrimaryHex(tokens);
  const secondary = resolveSecondaryHex(tokens);
  // Light: brand ends. Dark: brand washed into dark surfaces so the gradient
  // respects appearance instead of painting neon brand on a dark canvas.
  const gradFromLight = primary ?? tintLight;
  const gradToLight = secondary ?? lightSurfaces.surface ?? tintLight;
  const gradFromDark = primary
    ? mixHexColors(darkSurfaces.background, primary, 0.55)
    : tintDark;
  const gradToDark = secondary
    ? mixHexColors(darkSurfaces.background, secondary, 0.55)
    : darkSurfaces.surface ?? tintDark;

  const chromeGradientLight =
    style === "gradient" ? buildPresetGradient(gradFromLight, gradToLight) : null;
  const chromeGradientDark =
    style === "gradient" ? buildPresetGradient(gradFromDark, gradToDark) : null;

  const midLight =
    style === "gradient" ? mixHexColors(gradFromLight, gradToLight, 0.5) : null;
  const midDark =
    style === "gradient" ? mixHexColors(gradFromDark, gradToDark, 0.5) : null;

  const themeColorLight = themeColorForStyle(
    style,
    tintLight,
    lightSurfaces.background,
    opacity,
    midLight,
  );
  const themeColorDark = themeColorForStyle(
    style,
    tintDark,
    darkSurfaces.background,
    opacity,
    midDark,
  );

  return {
    themeColorLight,
    themeColorDark,
    backgroundColor: themeColorLight,
    iosStatusBarStyle,
    chromeTintStyle: style,
    chromeTintOpacity: opacity,
    chromeGradientLight,
    chromeGradientDark,
  };
}
