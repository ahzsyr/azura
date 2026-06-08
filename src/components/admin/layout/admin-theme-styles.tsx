import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import { buildAdminShellThemeCss } from "@/lib/theme/tokens/admin-scoped-css";

type Props = {
  resolved: ResolvedTheme;
};

/** Injects published site brand colors into `.admin-shell` only. */
export function AdminThemeStyles({ resolved }: Props) {
  const css = buildAdminShellThemeCss(resolved.tokens);
  const { typography } = resolved.tokens;
  const body = typography.bodyFont.replace(/ /g, "+");
  const heading = typography.headingFont.replace(/ /g, "+");
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
