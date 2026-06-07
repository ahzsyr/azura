import { buildThemeCss } from "@/features/theme/tokens";
import type { ThemeTokens } from "@/types/theme";

/** SSR-safe injected theme variables (no client APIs). */
export function ThemeStyles({
  tokens,
  presetVisualCss = "",
}: {
  tokens: ThemeTokens;
  presetVisualCss?: string;
}) {
  const css = buildThemeCss(tokens);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {presetVisualCss ? <style dangerouslySetInnerHTML={{ __html: presetVisualCss }} /> : null}
    </>
  );
}
