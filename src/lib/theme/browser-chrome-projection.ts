import type { Metadata, Viewport } from "next";
import type { ThemeTokens } from "@/types/theme";
import type { ResolvedAppearance } from "@/features/theme/engine/types";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import {
  DEFAULT_DARK_SURFACES,
  DEFAULT_LIGHT_SURFACES,
} from "@/features/theme/surfaces/theme-surfaces";
import {
  resolveMobileBrowserTheme,
  type ResolvedMobileBrowserTheme,
} from "@/lib/theme/resolve-mobile-browser-theme";
import {
  activeSiteGlassTint,
  resolveSiteGlassTintPair,
} from "@/lib/theme/resolve-site-glass-tint";

/** Serializable browser projection for boot / ThemeState. */
export type BrowserProjection = {
  themeColorLight: string;
  themeColorDark: string;
  backgroundColor: string;
  iosStatusBarStyle: ResolvedMobileBrowserTheme["iosStatusBarStyle"];
  chromeTintStyle: ResolvedMobileBrowserTheme["chromeTintStyle"];
  /** surface | primary — which colour the chrome is derived from. */
  chromeTintSource: ResolvedMobileBrowserTheme["chromeTintSource"];
  chromeTintOpacity: number;
  chromeGradientLight: string | null;
  chromeGradientDark: string | null;
  /**
   * Site Liquid Glass fill (surface role) — distinct from themeColor / page canvas.
   * OS chrome continues to use themeColorLight/Dark only.
   */
  glassTintLight: string;
  glassTintDark: string;
};

const FALLBACK_GLASS = resolveSiteGlassTintPair();

export const BROWSER_CHROME_FALLBACK: BrowserProjection = {
  themeColorLight: DEFAULT_LIGHT_SURFACES.background,
  themeColorDark: DEFAULT_DARK_SURFACES.background,
  backgroundColor: DEFAULT_LIGHT_SURFACES.background,
  iosStatusBarStyle: "black-translucent",
  chromeTintStyle: "glass",
  chromeTintSource: "surface",
  chromeTintOpacity: 0.7,
  chromeGradientLight: null,
  chromeGradientDark: null,
  glassTintLight: FALLBACK_GLASS.light,
  glassTintDark: FALLBACK_GLASS.dark,
};

/** Cookie mirrored from public appearance mode (client Forced sync / analytics). */
export const APPEARANCE_MODE_COOKIE = "devi-theme-mode";

export function toBrowserProjection(
  mobile: ResolvedMobileBrowserTheme,
  glassPair: { light: string; dark: string } = FALLBACK_GLASS,
): BrowserProjection {
  return {
    themeColorLight: mobile.themeColorLight,
    themeColorDark: mobile.themeColorDark,
    backgroundColor: mobile.backgroundColor,
    iosStatusBarStyle: mobile.iosStatusBarStyle,
    chromeTintStyle: mobile.chromeTintStyle,
    chromeTintSource: mobile.chromeTintSource,
    chromeTintOpacity: mobile.chromeTintOpacity,
    chromeGradientLight: mobile.chromeGradientLight,
    chromeGradientDark: mobile.chromeGradientDark,
    glassTintLight: glassPair.light,
    glassTintDark: glassPair.dark,
  };
}

/** Merge visitor/site preset colors into tokens for chrome resolution (active theme). */
export function tokensForChromeResolution(
  siteTheme: ThemeTokens | null | undefined,
  visitorColors?: PresetColorTokens | null,
): ThemeTokens | null {
  if (!siteTheme) return null;
  if (!visitorColors) return siteTheme;
  // primaryColor must move with visitor primary so chromeTintSource: "primary"
  // washes the visitor brand (resolvePrimaryHex prefers primaryColor first).
  const visitorPrimary =
    typeof visitorColors.primary === "string" && visitorColors.primary.trim()
      ? visitorColors.primary.trim()
      : undefined;
  return {
    ...siteTheme,
    ...(visitorPrimary ? { primaryColor: visitorPrimary } : {}),
    presetColors: {
      primary: visitorColors.primary,
      accent: visitorColors.accent ?? visitorColors.primary,
      background: visitorColors.background,
      surface: visitorColors.surface,
      text: visitorColors.text,
      textMuted: visitorColors.textMuted,
      secondary: visitorColors.secondary,
    },
  };
}

export function resolveBrowserProjection(
  siteTheme: ThemeTokens | null | undefined,
  visitorColors?: PresetColorTokens | null,
): BrowserProjection {
  const tokens = tokensForChromeResolution(siteTheme, visitorColors);
  if (!tokens) return BROWSER_CHROME_FALLBACK;
  const glassPair = resolveSiteGlassTintPair(
    tokens.presetColors ?? visitorColors ?? null,
    tokens.primaryColor,
  );
  return toBrowserProjection(resolveMobileBrowserTheme(tokens), glassPair);
}

export function activeBrowserThemeColor(
  projection: BrowserProjection,
  resolved: ResolvedAppearance,
): string {
  return resolved === "dark" ? projection.themeColorDark : projection.themeColorLight;
}

/** Site glass fill for the active appearance (never OS theme-color / page canvas). */
export function activeBrowserGlassTint(
  projection: BrowserProjection,
  resolved: ResolvedAppearance,
): string {
  return activeSiteGlassTint(
    { light: projection.glassTintLight, dark: projection.glassTintDark },
    resolved,
  );
}

/**
 * SSR viewport emission — always media-scoped light/dark pairs.
 * Stable DOM shape across soft navigations; Forced collapse is client-only
 * (theme-init + ThemeEngineProvider). Do not emit a single themeColor string.
 */
export function buildChromeViewport(options: {
  projection: BrowserProjection;
  darkModeEnabled: boolean;
  /** When edge-to-edge is on, Android and iOS both need viewport-fit=cover. */
  edgeToEdge?: boolean;
}): Viewport {
  const { projection, darkModeEnabled } = options;
  const edgeToEdge = options.edgeToEdge !== false;
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: edgeToEdge ? "cover" : "auto",
    colorScheme: darkModeEnabled ? "light dark" : "light",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: projection.themeColorLight },
      { media: "(prefers-color-scheme: dark)", color: projection.themeColorDark },
    ],
  };
}

export function buildChromeAppleWebApp(
  projection: BrowserProjection,
): NonNullable<Metadata["appleWebApp"]> {
  return {
    capable: true,
    statusBarStyle: projection.iosStatusBarStyle,
  };
}

export function chromeViewportFallback(): Viewport {
  return buildChromeViewport({
    projection: BROWSER_CHROME_FALLBACK,
    darkModeEnabled: false,
  });
}
