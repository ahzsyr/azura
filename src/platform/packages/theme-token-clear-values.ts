/**
 * Pinned clear values for M7.3 rich theme field null merges.
 * Match Theme Studio save fallbacks (actions.ts / theme-config defaults).
 */
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
} from "@/features/theme/theme-config";
import type { PackageMobileBrowserConfig } from "@/platform/packages/theme-token-rich-schemas";

export const CLEAR_CUSTOM_CSS = null;

export function clearBrandConfig(): ReturnType<typeof normalizeBranding> {
  return normalizeBranding({});
}

export const CLEAR_HEADER_CONFIG = DEFAULT_HEADER_CONFIG;
export const CLEAR_FOOTER_CONFIG = DEFAULT_FOOTER_CONFIG;

export const CLEAR_VISUAL_EFFECT_SETTINGS = { intensity: 1, opacity: 1 } as const;
export const CLEAR_GLASS_EFFECT_SETTINGS = { intensity: 1, opacity: 0.45 } as const;
export const CLEAR_MOTION_SETTINGS = { intensity: 1, opacity: 1 } as const;

/** Matches saveThemeDraft mobileBrowserConfig fallback + package-complete shape. */
export const CLEAR_MOBILE_BROWSER_CONFIG: PackageMobileBrowserConfig = {
  syncWithTheme: true,
  chromeTintSource: "surface",
  chromeTintStyle: "glass",
  chromeTintOpacity: 0.5,
  chromeTintGlassOpacity: 0.7,
  browserThemeColorLight: null,
  browserThemeColorDark: null,
  browserBackgroundColor: null,
  iosStatusBarStyle: "black-translucent",
  edgeToEdge: true,
};
