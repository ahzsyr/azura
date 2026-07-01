import type { PresetDefinition } from "@/features/theme/preset-resolver.types";
import type {
  AppearanceMode,
  PresetEffectsPayload,
} from "@/features/theme/engine/types";
import type { ThemeTokens } from "@/types/theme";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { tokensToThemeConfig, type ThemeConfig } from "./migration-adapters";

export type ThemeSourceInput = {
  /** Database / published site tokens */
  site?: ThemeTokens | null;
  /** Industry preset JSON definition */
  preset?: PresetDefinition | null;
  /** Visitor localStorage overrides (client-only; optional for SSR) */
  visitor?: {
    colors?: import("@/features/theme/engine/types").PresetColorTokens | null;
    effects?: PresetEffectsPayload | null;
    appearanceMode?: AppearanceMode | null;
  } | null;
};

function applyPresetToConfig(config: ThemeConfig, preset: PresetDefinition): ThemeConfig {
  const sitePrimary = config.colors.primary?.trim();
  const siteSecondary = config.colors.secondary?.trim();
  const presetPrimary = preset.colors.primary;
  const presetAccent =
    preset.colors.accent ?? preset.colors.secondary ?? preset.colors.primary;
  const primary = sitePrimary || presetPrimary;
  const secondary = siteSecondary || presetAccent;

  return {
    ...config,
    colors: {
      primary,
      secondary,
      presetColors: {
        primary,
        accent: secondary,
        secondary: preset.colors.secondary,
        background: preset.colors.background,
        surface: preset.colors.surface,
        text: preset.colors.text,
        textMuted: preset.colors.textMuted,
      },
    },
    effects: {
      ...config.effects,
      cursor: config.effects.cursor ?? preset.cursor ?? null,
      background: config.effects.background ?? preset.backgroundEffect ?? null,
      text: config.effects.text ?? preset.textEffect ?? null,
    },
    cards: {
      style: config.cards.style ?? preset.cardStyle ?? null,
    },
    borders: {
      style: config.borders.style ?? preset.borderStyle ?? null,
    },
    backgrounds: {
      effect: config.backgrounds.effect ?? preset.backgroundEffect ?? null,
      settings: config.backgrounds.settings,
    },
    presets: {
      ...config.presets,
      siteDefaultPresetId: preset.id,
    },
  };
}

function applyVisitorToConfig(
  config: ThemeConfig,
  visitor: NonNullable<ThemeSourceInput["visitor"]>,
): ThemeConfig {
  let next = { ...config };

  if (visitor.colors) {
    next = {
      ...next,
      colors: {
        ...next.colors,
        primary: visitor.colors.primary,
        secondary: visitor.colors.accent,
        presetColors: visitor.colors,
      },
    };
  }

  if (visitor.effects) {
    const fx = visitor.effects;
    next = {
      ...next,
      effects: {
        ...next.effects,
        cursor: fx.cursor ?? next.effects.cursor,
        background: fx.backgroundEffect ?? next.effects.background,
        text: fx.textEffect ?? next.effects.text,
      },
      cards: {
        style: fx.cardStyle ?? next.cards.style,
      },
      borders: {
        style: fx.borderStyle ?? next.borders.style,
      },
    };
  }

  return next;
}

/**
 * Single merge point for theme state. Site DB values are the base;
 * preset JSON enriches; visitor overrides win when provided.
 */
export function mergeThemeSources(sources: ThemeSourceInput): ThemeConfig {
  const baseTokens = sources.site ?? getDefaultThemeTokens();
  let config = tokensToThemeConfig(baseTokens);

  const shouldApplySitePreset = Boolean(sources.preset);

  if (sources.preset && shouldApplySitePreset) {
    config = applyPresetToConfig(config, sources.preset);
  }

  if (sources.visitor) {
    config = applyVisitorToConfig(config, sources.visitor);
  }

  return config;
}
