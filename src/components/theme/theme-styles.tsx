import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import {
  buildGoogleFontsHrefForFonts,
  collectThemeFonts,
  resolveThemeFonts,
} from "@/lib/theme/font-registry";

/** SSR-safe injected theme variables (no client APIs, no <link> in body). */
export function ThemeStyles({ resolved }: { resolved: ResolvedTheme }) {
  const { theme, presetVisual } = resolved.css;
  const typography = resolved.tokens.typography;
  const fonts = resolveThemeFonts(typography);
  const allFonts = collectThemeFonts(typography);

  const fontImport =
    fonts.needsExternalLink && allFonts.length > 0
      ? `@import url(${JSON.stringify(buildGoogleFontsHrefForFonts(allFonts))});`
      : "";

  const css = [
    fontImport,
    fonts.cssOverride ?? "",
    theme,
    presetVisual ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
