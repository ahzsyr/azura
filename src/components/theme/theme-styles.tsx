import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import {
  buildGoogleFontsHrefForFonts,
  collectThemeFonts,
  resolveThemeFonts,
} from "@/lib/theme/font-registry";
import { FontVariables } from "./font-variables";

/** SSR-safe injected theme variables (no client APIs). */
export function ThemeStyles({ resolved }: { resolved: ResolvedTheme }) {
  const { theme, presetVisual } = resolved.css;
  const typography = resolved.tokens.typography;
  const fonts = resolveThemeFonts(typography);
  const allFonts = collectThemeFonts(typography);

  return (
    <>
      {fonts.needsExternalLink ? (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={buildGoogleFontsHrefForFonts(allFonts)} />
        </>
      ) : null}
      {fonts.classNames ? <FontVariables classNames={fonts.classNames} /> : null}
      {fonts.cssOverride ? (
        <style dangerouslySetInnerHTML={{ __html: fonts.cssOverride }} />
      ) : null}
      <style dangerouslySetInnerHTML={{ __html: theme }} />
      {presetVisual ? (
        <style dangerouslySetInnerHTML={{ __html: presetVisual }} />
      ) : null}
    </>
  );
}
