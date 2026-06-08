import { resolvePublishedSiteTheme, resolvePreviewSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import { ThemeStyles } from "./theme-styles";
import { ThemeWrapper } from "./theme-wrapper";
import { ThemeEffectsClient } from "./theme-effects-client";
import { ThemeEngineProvider } from "./theme-engine-provider";
import { VisualExperienceProvider } from "./visual-experience-provider";
import type { ResolvedTheme } from "@/lib/theme/theme-resolver";

type ThemeProviderProps = {
  children: React.ReactNode;
  /** Pre-resolved theme — skips duplicate resolution when provided. */
  resolved?: ResolvedTheme | null;
  previewDraft?: boolean;
};

export async function ThemeProvider({
  children,
  resolved: initialResolved,
  previewDraft = false,
}: ThemeProviderProps) {
  const resolved =
    initialResolved ??
    (previewDraft
      ? await resolvePreviewSiteTheme()
      : await resolvePublishedSiteTheme());

  const siteResolved = resolveVisualExperience({ site: resolved.tokens });

  return (
    <>
      <ThemeStyles resolved={resolved} />
      <VisualExperienceProvider site={resolved.tokens} siteResolved={siteResolved}>
        <ThemeWrapper resolved={resolved}>
          <ThemeEngineProvider
            siteTheme={resolved.tokens}
            defaultPresetId={resolved.preset.presetId}
            defaultAppearance={resolved.appearance.mode}
            ssrHtmlAttributes={resolved.htmlAttributes}
            siteResolved={siteResolved}
          >
            <ThemeEffectsClient tokens={resolved.tokens} siteResolved={siteResolved} />
            {children}
          </ThemeEngineProvider>
        </ThemeWrapper>
      </VisualExperienceProvider>
    </>
  );
}
