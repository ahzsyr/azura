import { normalizeBranding } from "@/features/navigation/branding-defaults";
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
} from "@/features/theme/theme-config";
import { DEFAULT_THEME_COLORS, DEFAULT_TYPOGRAPHY } from "@/features/theme/tokens/design-tokens";
import type { ThemeTokens } from "@/types/theme";

/** Fallback theme when DB is unavailable — keeps background/typography styled. */
export function getDefaultThemeTokens(): ThemeTokens {
  return {
    preset: "CLASSIC",
    siteDefaultPresetId: null,
    activePresetId: null,
    primaryColor: DEFAULT_THEME_COLORS.primary,
    secondaryColor: DEFAULT_THEME_COLORS.secondary,
    cursorEffect: null,
    backgroundEffect: null,
    textEffect: null,
    cursorEffectEnabled: true,
    backgroundEffectEnabled: true,
    textEffectEnabled: true,
    glassEffectEnabled: false,
    backgroundEffectSettings: { intensity: 1, opacity: 1 },
    cursorEffectSettings: { intensity: 1, opacity: 1 },
    textEffectSettings: { intensity: 1, opacity: 1 },
    glassEffectSettings: { intensity: 1, opacity: 0.45 },
    motionSettings: { intensity: 1, opacity: 1 },
    cardStyle: null,
    borderStyle: null,
    typography: DEFAULT_TYPOGRAPHY,
    faviconUrl: null,
    logoUrl: null,
    brandConfig: normalizeBranding({}),
    headerConfig: DEFAULT_HEADER_CONFIG,
    footerConfig: DEFAULT_FOOTER_CONFIG,
    animationsEnabled: true,
    animationSpeed: 1,
    lazyLoadEnabled: true,
    darkModeEnabled: true,
    spacingScale: 1,
    customCss: null,
    themeProvenance: {
      sourcePresetId: null,
      appliedAt: null,
    },
    mobileBrowserConfig: {
      syncWithTheme: true,
      browserThemeColorLight: null,
      browserThemeColorDark: null,
      browserBackgroundColor: null,
      iosStatusBarStyle: "black-translucent",
    },
  };
}
