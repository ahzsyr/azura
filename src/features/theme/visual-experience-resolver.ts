import { parseBackgroundEffectSettings } from "@/features/theme/backgrounds/settings";
import {
  parseMotionSettings,
  parseVisualEffectSettings,
} from "@/features/theme/effect-settings";
import type { PageVisualSettings } from "@/schemas/visual-settings";
import type {
  BackgroundEffectSettings,
  MotionSettings,
  ThemeTokens,
  VisualEffectSettings,
} from "@/types/theme";
import { resolvePageEffectConfig } from "@/lib/theme/effects/inheritance";
import type { CursorPreference, PresetEffectsPayload } from "@/features/theme/engine/types";

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
  backgroundEffectSettings: BackgroundEffectSettings;
  cursorEffectSettings: VisualEffectSettings;
  textEffectSettings: VisualEffectSettings;
  motionSettings: MotionSettings;
  animationSpeed: number;
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
    { glassOverlay: site.cardStyle === "glassmorphism" || site.cardStyle === "liquid-glass" },
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
    backgroundEffectSettings: site.backgroundEffectSettings,
    cursorEffectSettings: site.cursorEffectSettings,
    textEffectSettings: site.textEffectSettings,
    motionSettings: site.motionSettings,
    animationSpeed: site.animationSpeed,
  };
}

function hasLiveEffects(e: PresetEffectsPayload | null | undefined): boolean {
  if (!e) return false;
  return Boolean(
    e.cursor ||
      e.backgroundEffect ||
      e.textEffect ||
      e.cardStyle ||
      e.borderStyle,
  );
}

type ResolveVisitorInput = {
  site: ThemeTokens;
  page?: PageVisualSettings | null;
  storedEffects?: PresetEffectsPayload | null;
  cursorPreference?: CursorPreference;
};

/** Visitor localStorage overrides > CMS page override > site theme defaults. */
export function resolveVisitorVisualExperience({
  site,
  page,
  storedEffects,
  cursorPreference = "custom",
}: ResolveVisitorInput): ResolvedVisualExperience {
  const base = resolveVisualExperience({ site, page });

  if (!storedEffects || !hasLiveEffects(storedEffects)) {
    if (cursorPreference === "normal") {
      return { ...base, cursorEffect: null, cursorEnabled: false };
    }
    return base;
  }

  const visitorBackground =
    storedEffects.backgroundEffect != null && storedEffects.backgroundEffect !== ""
      ? storedEffects.backgroundEffect
      : null;

  const cursorEnabled = base.cursorEnabled && cursorPreference !== "normal";
  const cursor = !cursorEnabled
    ? null
    : (storedEffects.cursor ?? base.cursorEffect);

  const background = visitorBackground ?? base.backgroundEffect;
  const backgroundEnabled = visitorBackground
    ? Boolean(visitorBackground && visitorBackground !== "none")
    : base.backgroundEnabled;

  const text =
    storedEffects.textEffect != null && storedEffects.textEffect !== ""
      ? storedEffects.textEffect
      : base.textEffect;

  return {
    cursorEffect: cursor,
    backgroundEffect: background,
    textEffect: text,
    animationsEnabled: base.animationsEnabled,
    cardStyle: storedEffects.cardStyle ?? base.cardStyle,
    borderStyle: storedEffects.borderStyle ?? base.borderStyle,
    cursorEnabled,
    backgroundEnabled,
    textEnabled: base.textEnabled,
    backgroundEffectSettings:
      storedEffects.backgroundEffectSettings != null
        ? parseBackgroundEffectSettings(storedEffects.backgroundEffectSettings)
        : base.backgroundEffectSettings,
    cursorEffectSettings:
      storedEffects.cursorEffectSettings != null
        ? parseVisualEffectSettings(storedEffects.cursorEffectSettings)
        : base.cursorEffectSettings,
    textEffectSettings:
      storedEffects.textEffectSettings != null
        ? parseVisualEffectSettings(storedEffects.textEffectSettings)
        : base.textEffectSettings,
    motionSettings:
      storedEffects.motionSettings != null
        ? parseMotionSettings(storedEffects.motionSettings)
        : base.motionSettings,
    animationSpeed: base.animationSpeed,
  };
}

export { resolveBlockTextEffect as resolveBlockHeadingTextEffect } from "@/lib/theme/effects/inheritance";
