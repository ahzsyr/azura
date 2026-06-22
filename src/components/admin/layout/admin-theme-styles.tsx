import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import { buildAdminShellThemeCss } from "@/lib/theme/tokens/admin-scoped-css";

type Props = {
  resolved: ResolvedTheme;
};

function fontForGoogleCss(value: unknown, fallback: string): string {
  const font = typeof value === "string" && value.trim() ? value : fallback;
  if (typeof value !== "string" || !value.trim()) {
  }
  return font.replace(/ /g, "+");
}

/** Injects published site brand colors into `.admin-shell` only. */
export function AdminThemeStyles({ resolved }: Props) {
  const css = buildAdminShellThemeCss(resolved.tokens);
  const { typography } = resolved.tokens;
  const body = fontForGoogleCss(typography.bodyFont, "Plus Jakarta Sans");
  const heading = fontForGoogleCss(typography.headingFont, "Amiri");
  const fontsHref = `https://fonts.googleapis.com/css2?family=${body}:wght@400;500;600;700&family=${heading}:wght@400;700&display=swap`;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontsHref} />
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}
