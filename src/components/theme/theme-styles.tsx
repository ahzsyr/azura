import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import type { ThemeTokens } from "@/types/theme";

function buildGoogleFontsHref(typography: ThemeTokens["typography"]): string {
  const body = typography.bodyFont.replace(/ /g, "+");
  const heading = typography.headingFont.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${body}:wght@400;500;600;700&family=${heading}:wght@400;700&display=swap`;
}

/** SSR-safe injected theme variables (no client APIs). */
export function ThemeStyles({ resolved }: { resolved: ResolvedTheme }) {
  const { theme, presetVisual } = resolved.css;
  const fontsHref = buildGoogleFontsHref(resolved.tokens.typography);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontsHref} />
      <style dangerouslySetInnerHTML={{ __html: theme }} />
      {presetVisual ? (
        <style dangerouslySetInnerHTML={{ __html: presetVisual }} />
      ) : null}
    </>
  );
}
