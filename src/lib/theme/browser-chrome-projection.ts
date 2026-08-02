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

/** Serializable browser projection for boot / ThemeState. */
export type BrowserProjection = {
  themeColorLight: string;
  themeColorDark: string;
  backgroundColor: string;
  iosStatusBarStyle: ResolvedMobileBrowserTheme["iosStatusBarStyle"];
};

export const BROWSER_CHROME_FALLBACK: BrowserProjection = {
  themeColorLight: DEFAULT_LIGHT_SURFACES.background,
  themeColorDark: DEFAULT_DARK_SURFACES.background,
  backgroundColor: DEFAULT_LIGHT_SURFACES.background,
  iosStatusBarStyle: "default",
};

/** Cookie mirrored from public appearance mode (client Forced sync / analytics). */
export const APPEARANCE_MODE_COOKIE = "devi-theme-mode";

export function toBrowserProjection(
  mobile: ResolvedMobileBrowserTheme,
): BrowserProjection {
  return {
    themeColorLight: mobile.themeColorLight,
    themeColorDark: mobile.themeColorDark,
    backgroundColor: mobile.backgroundColor,
    iosStatusBarStyle: mobile.iosStatusBarStyle,
  };
}

/** Merge visitor/site preset colors into tokens for chrome resolution (active theme). */
export function tokensForChromeResolution(
  siteTheme: ThemeTokens | null | undefined,
  visitorColors?: PresetColorTokens | null,
): ThemeTokens | null {
  if (!siteTheme) return null;
  if (!visitorColors) return siteTheme;
  return {
    ...siteTheme,
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
  return toBrowserProjection(resolveMobileBrowserTheme(tokens));
}

export function activeBrowserThemeColor(
  projection: BrowserProjection,
  resolved: ResolvedAppearance,
): string {
  return resolved === "dark" ? projection.themeColorDark : projection.themeColorLight;
}

/**
 * SSR viewport emission — always media-scoped light/dark pairs.
 * Stable DOM shape across soft navigations; Forced collapse is client-only
 * (theme-init + ThemeEngineProvider). Do not emit a single themeColor string.
 */
export function buildChromeViewport(options: {
  projection: BrowserProjection;
  darkModeEnabled: boolean;
}): Viewport {
  const { projection, darkModeEnabled } = options;
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
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
