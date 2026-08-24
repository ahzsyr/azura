import type { ThemeTypographySettings } from "@/schemas/theme";
import { collectThemeFonts } from "@/lib/theme/locale-fonts";

/** Known theme fonts and their CSS family strings (loaded via Google Fonts CDN). */
const FONT_MAP: Record<string, { cssFamily: string; weights: string }> = {
  "Plus Jakarta Sans": {
    cssFamily: '"Plus Jakarta Sans"',
    weights: "400;500;600;700",
  },
  Amiri: {
    cssFamily: "Amiri",
    weights: "400;700",
  },
};

export type ResolvedFonts = {
  classNames: string;
  cssOverride: string | null;
  needsExternalLink: boolean;
  bodyFont: string;
  headingFont: string;
};

/** Collect all font families referenced by global and locale-specific typography. */
export { collectThemeFonts } from "@/lib/theme/locale-fonts";

function cssFamilyForFont(font: string): string {
  return FONT_MAP[font]?.cssFamily ?? `"${font.replace(/"/g, '\\"')}"`;
}

export function resolveNextFonts(bodyFont: string, headingFont: string): ResolvedFonts {
  const bodyFamily = cssFamilyForFont(bodyFont);
  const headingFamily = cssFamilyForFont(headingFont);

  const cssOverride = `:root{--az-font-body:${bodyFamily},sans-serif;--az-font-display:${headingFamily},serif;--font-body:${bodyFamily},sans-serif;--font-display:${headingFamily},serif;}`;

  return {
    classNames: "",
    cssOverride,
    needsExternalLink: true,
    bodyFont,
    headingFont,
  };
}

/** Resolve font loading for full typography config including locale overrides. */
export function resolveThemeFonts(typography: ThemeTypographySettings): ResolvedFonts {
  const allFonts = collectThemeFonts(typography);
  const global = resolveNextFonts(typography.bodyFont, typography.headingFont);

  return {
    ...global,
    needsExternalLink: allFonts.length > 0,
  };
}

export function buildGoogleFontsHref(bodyFont: string, headingFont: string): string {
  return buildGoogleFontsHrefForFonts([bodyFont, headingFont]);
}

export function buildGoogleFontsHrefForFonts(fonts: string[]): string {
  const unique = [...new Set(fonts.filter(Boolean))];
  if (unique.length === 0) return "";

  const families = unique
    .map((font) => {
      const known = FONT_MAP[font];
      const weights = known?.weights ?? "400;500;600;700";
      return `family=${font.replace(/ /g, "+")}:wght@${weights}`;
    })
    .join("&");

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
