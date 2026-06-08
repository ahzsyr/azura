import type { PageVisualSettings } from "@/schemas/visual-settings";
import type { ThemeTokens } from "@/types/theme";
import { resolvePageEffectConfig } from "@/lib/theme/effects/inheritance";

export type ResolvedVisualExperience = {
  cursorEffect: string | null;
  backgroundEffect: string | null;
  textEffect: string | null;
  animationsEnabled: boolean;
  cardStyle: string | null;
  borderStyle: string | null;
  cursorEnabled: boolean;
  backgroundEnabled: boolean;
  textEnabled: boolean;
};

type ResolveInput = {
  site: ThemeTokens;
  page?: PageVisualSettings | null;
};

export function resolveVisualExperience({ site, page }: ResolveInput): ResolvedVisualExperience {
  const effectConfig = resolvePageEffectConfig(
    {
      cursorEffect: site.cursorEffect,
      backgroundEffect: site.backgroundEffect,
      textEffect: site.textEffect,
      cursorEnabled: site.cursorEffectEnabled !== false,
      backgroundEnabled: site.backgroundEffectEnabled !== false,
      textEnabled: site.textEffectEnabled !== false,
      animationsEnabled: site.animationsEnabled,
    },
    page,
    { glassOverlay: site.cardStyle === "glassmorphism" },
  );

  return {
    cursorEffect: effectConfig.cursor.enabled ? effectConfig.cursor.effectId : null,
    backgroundEffect: effectConfig.background.enabled ? effectConfig.background.effectId : null,
    textEffect: effectConfig.text.enabled ? effectConfig.text.effectId : null,
    animationsEnabled: effectConfig.animationsEnabled,
    cardStyle: site.cardStyle ?? null,
    borderStyle: site.borderStyle ?? null,
    cursorEnabled: effectConfig.cursor.enabled,
    backgroundEnabled: effectConfig.background.enabled,
    textEnabled: effectConfig.text.enabled,
  };
}

export { resolveBlockTextEffect as resolveBlockHeadingTextEffect } from "@/lib/theme/effects/inheritance";
