import { themeService } from "@/features/theme/theme.service";
import { loadPresetJson } from "@/features/theme/preset-resolver";
import { presetVisualToCssBlock, resolvePresetVisual } from "@/features/theme/presets";
import { ThemeStyles } from "./theme-styles";
import { ThemeWrapper } from "./theme-wrapper";
import { ThemeEffectsClient } from "./theme-effects-client";
import { ThemeEngineProvider } from "./theme-engine-provider";
import { ThemePresetAttributes } from "./theme-preset-attributes";
import { VisualExperienceProvider } from "./visual-experience-provider";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import type { ThemeTokens } from "@/types/theme";

async function loadThemeTokens(previewDraft: boolean): Promise<ThemeTokens | null> {
  try {
    return await themeService.getForPreview(previewDraft);
  } catch (error) {
    console.error("[ThemeProvider] theme load failed:", error);
    return null;
  }
}

async function loadPresetVisualCss(activePresetId: string | null | undefined): Promise<string> {
  if (!activePresetId) return "";
  try {
    const preset = await loadPresetJson(activePresetId);
    if (!preset) return "";
    return presetVisualToCssBlock(resolvePresetVisual(preset));
  } catch (error) {
    console.error("[ThemeProvider] preset visual load failed:", error);
    return "";
  }
}

type ThemeProviderProps = {
  children: React.ReactNode;
  /** Preloaded theme from layout shell — avoids a duplicate DB fetch. */
  tokens?: ThemeTokens | null;
  previewDraft?: boolean;
};

export async function ThemeProvider({
  children,
  tokens: initialTokens,
  previewDraft = false,
}: ThemeProviderProps) {
  const loaded =
    initialTokens !== undefined
      ? initialTokens
      : await loadThemeTokens(previewDraft);
  const tokens = loaded ?? getDefaultThemeTokens();
  const presetVisualCss = await loadPresetVisualCss(tokens.activePresetId);

  return (
    <>
      <ThemeStyles tokens={tokens} presetVisualCss={presetVisualCss} />
      <ThemePresetAttributes
        cardStyle={tokens.cardStyle}
        borderStyle={tokens.borderStyle}
        activePresetId={tokens.activePresetId}
      />
      <VisualExperienceProvider site={tokens}>
        <ThemeWrapper tokens={tokens}>
          <ThemeEngineProvider
            siteTheme={tokens}
            defaultPresetId={tokens.activePresetId ?? null}
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
