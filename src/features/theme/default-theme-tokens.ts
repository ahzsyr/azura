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
    backgroundEffectSettings: { intensity: 1, opacity: 1 },
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
  };
}
