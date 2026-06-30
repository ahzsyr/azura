import type { ThemeTypographySettings } from "@/schemas/theme";

/** Collect all font families referenced by global and locale-specific typography. */
export function collectThemeFonts(typography: ThemeTypographySettings): string[] {
  const fonts = new Set<string>([typography.bodyFont, typography.headingFont]);
  if (typography.localeFonts) {
    for (const override of Object.values(typography.localeFonts)) {
      if (override.bodyFont) fonts.add(override.bodyFont);
      if (override.headingFont) fonts.add(override.headingFont);
    }
  }
  return Array.from(fonts);
}

/** Resolve effective fonts for a locale, falling back to global typography. */
export function resolveLocaleFonts(
  typography: ThemeTypographySettings,
  localeKey: string,
  alternateKey?: string,
): { bodyFont: string; headingFont: string } {
  const override =
    typography.localeFonts?.[localeKey] ??
    typography.localeFonts?.[localeKey.toLowerCase()] ??
    (alternateKey ? typography.localeFonts?.[alternateKey] : undefined);
  return {
    bodyFont: override?.bodyFont ?? typography.bodyFont,
    headingFont: override?.headingFont ?? typography.headingFont,
  };
}
