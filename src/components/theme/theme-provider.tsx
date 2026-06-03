import { cookies } from "next/headers";
import { themeService } from "@/features/theme/theme.service";
import { loadPresetJson } from "@/features/theme/preset-resolver";
import { presetVisualToCssBlock, resolvePresetVisual } from "@/features/theme/presets";
import { ThemeStyles } from "./theme-styles";
import { ThemeWrapper } from "./theme-wrapper";
import { ThemeEffectsClient } from "./theme-effects-client";
import { ThemeEngineProvider } from "./theme-engine-provider";
import { ThemePresetAttributes } from "./theme-preset-attributes";
import { VisualExperienceProvider } from "./visual-experience-provider";

export async function ThemeProvider({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const previewDraft = cookieStore.get("theme-preview")?.value === "draft";
  const tokens = await themeService.getForPreview(previewDraft);

  let presetVisualCss = "";
  if (tokens?.activePresetId) {
    const preset = await loadPresetJson(tokens.activePresetId);
    if (preset) {
      presetVisualCss = presetVisualToCssBlock(resolvePresetVisual(preset));
    }
  }

  return (
    <>
      {tokens && <ThemeStyles tokens={tokens} presetVisualCss={presetVisualCss} />}
      {tokens && (
        <ThemePresetAttributes
          cardStyle={tokens.cardStyle}
          borderStyle={tokens.borderStyle}
          activePresetId={tokens.activePresetId}
        />
      )}
      <VisualExperienceProvider site={tokens}>
        <ThemeWrapper tokens={tokens}>
          <ThemeEngineProvider
            siteTheme={tokens}
            defaultPresetId={tokens?.activePresetId ?? null}
            defaultAppearance="system"
          >
            <ThemeEffectsClient tokens={tokens} />
            {children}
          </ThemeEngineProvider>
        </ThemeWrapper>
      </VisualExperienceProvider>
    </>
  );
}
