import type { FooterBackground } from "@/features/footer/types";
import { chromeTintDataAttrs } from "@/lib/theme/scroll-chrome-tint";
import {
  DEFAULT_DARK_SURFACES,
  DEFAULT_LIGHT_SURFACES,
} from "@/features/theme/surfaces/theme-surfaces";
import { THEME_PRESET_DEFAULTS } from "@/features/theme/tokens/design-tokens";
import { coerceColorString } from "@/lib/theme/tokens/color-utils";

export type FooterChromeAccentPair = {
  /** Hex matching light-mode `bg-accent` / `--accent`. */
  accentLight: string;
  /** Hex matching dark-mode `bg-accent` / `--accent`. */
  accentDark: string;
};

const DEFAULT_ACCENT_LIGHT =
  coerceColorString(THEME_PRESET_DEFAULTS.CLASSIC.secondaryColor) ?? "#d4af37";

/**
 * Declare scroll chrome tint candidates for the footer.
 * Does not write theme-color — only data attributes for the observer.
 */
export function footerChromeTintAttrs(
  background: FooterBackground,
  accents?: Partial<FooterChromeAccentPair> | null,
): ReturnType<typeof chromeTintDataAttrs> {
  switch (background) {
    case "light":
      return chromeTintDataAttrs(
        DEFAULT_LIGHT_SURFACES.background,
        DEFAULT_DARK_SURFACES.background,
      );
    case "accent": {
      const light =
        coerceColorString(accents?.accentLight) ?? DEFAULT_ACCENT_LIGHT;
      const dark =
        coerceColorString(accents?.accentDark) ?? light;
      return chromeTintDataAttrs(light, dark);
    }
    case "dark":
    case "inherit":
    default:
      // Light slot must stay light so Safari / site-glass tint respect light
      // appearance when the footer is visually dark (bg-foreground).
      return chromeTintDataAttrs(
        DEFAULT_LIGHT_SURFACES.background,
        DEFAULT_DARK_SURFACES.background,
      );
  }
}

/** Resolve accent hex pair from site theme tokens for accent footers. */
export function accentsFromThemeTokens(tokens: {
  secondaryColor?: string | null;
  presetColors?: { accent?: string | null; secondary?: string | null } | null;
} | null | undefined): FooterChromeAccentPair {
  const fromPreset =
    coerceColorString(tokens?.presetColors?.accent) ||
    coerceColorString(tokens?.presetColors?.secondary);
  const secondary = coerceColorString(tokens?.secondaryColor);
  const accent = fromPreset || secondary || DEFAULT_ACCENT_LIGHT;
  // Theme CSS paints the same secondary into --accent for light and dark.
  return { accentLight: accent, accentDark: accent };
}
