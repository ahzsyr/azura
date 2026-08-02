import type { ThemeTokens } from "@/types/theme";
import type { IosStatusBarStyle } from "@/schemas/theme";
import { resolveThemeSurfaces } from "@/features/theme/surfaces/theme-surfaces";

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
 * surface tokens, providing automatic parity with the active theme palette.
 * When false the explicit override values from `mobileBrowserConfig` are used.
 */
const DEFAULT_MOBILE_BROWSER_CONFIG = {
  syncWithTheme: true,
  browserThemeColorLight: null as string | null,
  browserThemeColorDark: null as string | null,
  browserBackgroundColor: null as string | null,
  iosStatusBarStyle: "default" as IosStatusBarStyle,
};

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
      iosStatusBarStyle: config.iosStatusBarStyle ?? "default",
    };
  }

  // Auto-sync: derive from resolved surface background colors.
  const lightSurfaces = resolveThemeSurfaces(presetColors, "light", tokens.primaryColor);
  const darkSurfaces = resolveThemeSurfaces(presetColors, "dark", tokens.primaryColor);

  return {
    themeColorLight: lightSurfaces.background,
    themeColorDark: darkSurfaces.background,
    backgroundColor: lightSurfaces.background,
    iosStatusBarStyle: config.iosStatusBarStyle ?? "default",
  };
}
