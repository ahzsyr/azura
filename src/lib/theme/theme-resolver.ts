import type { ThemePreset } from "@prisma/client";
import type { PresetDefinition } from "@/features/theme/preset-resolver.types";
import {
  presetVisualToCssBlock,
  resolvePresetVisual as resolvePresetVisualFromDefinition,
} from "@/features/theme/presets";
import type { ResolvedPresetVisual } from "@/features/theme/presets/preset-visual.types";
import { buildThemeCss } from "@/features/theme/tokens";
import {
  resolveVisualExperience,
  type ResolvedVisualExperience,
} from "@/features/theme/visual-experience-resolver";
import type {
  AppearanceMode,
  PresetEffectsPayload,
  ResolvedAppearance,
} from "@/features/theme/engine/types";
import type { ThemeTokens } from "@/types/theme";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { PUBLIC_MOTION } from "@/lib/motion/public-motion";
import { resolveNextFonts } from "@/lib/theme/font-registry";
import {
  themeConfigToTokens,
  tokensToThemeConfig,
  type ThemeConfig,
} from "./migration-adapters";

export type { ThemeConfig } from "./migration-adapters";
export { themeConfigToTokens, tokensToThemeConfig } from "./migration-adapters";

export type MotionLevel = "off" | "reduced" | "normal" | "fast";

export type ResolvedMotion = {
  level: MotionLevel;
  scale: number;
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easeStandard: string;
  easeEmphasized: string;
};

export type PresetMetadata = {
  presetId: string | null;
  preset: ThemePreset;
  name: string | null;
};

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
  /** System appearance hint for SSR (e.g. from Accept-CH or default) */
  prefersDark?: boolean;
};

export type ResolvedTheme = {
  tokens: ThemeTokens;
  config: ThemeConfig;
  appearance: {
    mode: AppearanceMode;
    resolved: ResolvedAppearance;
  };
  motion: ResolvedMotion;
  cardStyle: string | null;
  borderStyle: string | null;
  preset: PresetMetadata;
  visual: ResolvedVisualExperience;
  presetVisual: ResolvedPresetVisual | null;
  css: {
    theme: string;
    presetVisual: string;
    vars: Record<string, string>;
  };
  htmlAttributes: Record<string, string>;
};

const MOTION_EASE_STANDARD = PUBLIC_MOTION.easeCss;
const MOTION_EASE_EMPHASIZED = PUBLIC_MOTION.easeCss;

function applyPresetToConfig(
  config: ThemeConfig,
  preset: PresetDefinition,
): ThemeConfig {
  return {
    ...config,
    colors: {
      primary: preset.colors.primary,
      secondary:
        preset.colors.accent ?? preset.colors.secondary ?? preset.colors.primary,
      presetColors: {
        primary: preset.colors.primary,
        accent: preset.colors.accent ?? preset.colors.primary,
        secondary: preset.colors.secondary,
        background: preset.colors.background,
        surface: preset.colors.surface,
        text: preset.colors.text,
        textMuted: preset.colors.textMuted,
      },
    },
    effects: {
      ...config.effects,
      cursor: preset.cursor ?? config.effects.cursor,
      background: preset.backgroundEffect ?? config.effects.background,
      text: preset.textEffect ?? config.effects.text,
    },
    cards: {
      style: preset.cardStyle ?? config.cards.style,
    },
    borders: {
      style: preset.borderStyle ?? config.borders.style,
    },
    backgrounds: {
      effect: preset.backgroundEffect ?? config.backgrounds.effect,
      settings: config.backgrounds.settings,
    },
    presets: {
      ...config.presets,
      activePresetId: preset.id,
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

  if (sources.preset) {
    config = applyPresetToConfig(config, sources.preset);
  }

  if (sources.visitor) {
    config = applyVisitorToConfig(config, sources.visitor);
  }

  return config;
}

/** Resolve flat runtime tokens from merged config. */
export function resolveThemeTokens(config: ThemeConfig): ThemeTokens {
  return themeConfigToTokens(config);
}

/** Resolve preset visual metrics from a preset definition. */
export function resolvePresetVisual(
  preset: PresetDefinition,
): ResolvedPresetVisual {
  return resolvePresetVisualFromDefinition(preset);
}

/** Server-safe appearance resolution (no `window`). */
export function resolveAppearance(
  mode: AppearanceMode,
  options?: { prefersDark?: boolean },
): ResolvedAppearance {
  if (mode === "system") {
    return options?.prefersDark ? "dark" : "light";
  }
  return mode === "dark" ? "dark" : "light";
}

/** Derive motion tokens and intensity level from theme config. */
export function resolveMotion(config: ThemeConfig): ResolvedMotion {
  const { animationsEnabled, animationSpeed } = config.motion;
  const scale = animationsEnabled ? animationSpeed : 0;

  let level: MotionLevel = "normal";
  if (!animationsEnabled || scale <= 0) {
    level = "off";
  } else if (scale < 0.75) {
    level = "reduced";
  } else if (scale > 1.25) {
    level = "fast";
  }

  const baseFast = 150;
  const baseNormal = 300;
  const baseSlow = 500;
  const factor = animationsEnabled ? animationSpeed : 0.01;

  return {
    level,
    scale: animationsEnabled ? animationSpeed : 0,
    durationFast: `${Math.round(baseFast * factor)}ms`,
    durationNormal: `${Math.round(baseNormal * factor)}ms`,
    durationSlow: `${Math.round(baseSlow * factor)}ms`,
    easeStandard: MOTION_EASE_STANDARD,
    easeEmphasized: MOTION_EASE_EMPHASIZED,
  };
}

function buildMotionCssVars(motion: ResolvedMotion): Record<string, string> {
  return {
    "--motion-scale": String(motion.scale),
    "--animation-speed": String(motion.scale),
    "--motion-duration-fast": motion.durationFast,
    "--motion-duration-normal": motion.durationNormal,
    "--motion-duration-slow": motion.durationSlow,
    "--motion-ease-standard": motion.easeStandard,
    "--motion-ease-emphasized": motion.easeEmphasized,
  };
}

export type HtmlAttributesInput = {
  config: ThemeConfig;
  visual: ResolvedVisualExperience;
  presetVisual: ResolvedPresetVisual | null;
  motion: ResolvedMotion;
  appearance: { mode: AppearanceMode; resolved: ResolvedAppearance };
};

/**
 * Build `<html>` data-* attributes for SSR and client reconciliation.
 * This is the only place site-default document hooks are assembled.
 */
export function generateHtmlAttributes(input: HtmlAttributesInput): Record<string, string> {
  const { config, visual, presetVisual, motion, appearance } = input;
  const attrs: Record<string, string> = {
    "data-theme": appearance.resolved,
    "data-theme-mode": appearance.mode,
    "data-motion": motion.level,
    "data-lazy-load": config.layout.lazyLoadEnabled ? "true" : "false",
  };

  if (config.layout.spacingScale !== 1) {
    attrs["data-spacing"] = "true";
    attrs["data-theme-spacing"] = "true";
  }

  const presetId = presetVisual?.presetId ?? config.presets.activePresetId;
  if (presetId) attrs["data-preset-id"] = presetId;

  const cardStyle = visual.cardStyle ?? presetVisual?.cardStyle ?? config.cards.style;
  if (cardStyle) attrs["data-card-style"] = cardStyle;

  const borderStyle =
    visual.borderStyle ?? presetVisual?.borderStyle ?? config.borders.style;
  if (borderStyle) attrs["data-border-style"] = borderStyle;

  const backgroundEffect =
    visual.backgroundEffect ??
    presetVisual?.backgroundEffect ??
    config.backgrounds.effect;
  if (backgroundEffect && backgroundEffect !== "none") {
    attrs["data-preset-background"] = backgroundEffect;
  }

  const textEffect = visual.textEffect ?? presetVisual?.textEffect ?? config.effects.text;
  if (textEffect && textEffect !== "none") {
    attrs["data-preset-text-effect"] = textEffect;
    attrs["data-text-effect-theme"] = textEffect;
  }

  if (presetVisual?.metrics.particlesEnabled) {
    attrs["data-preset-particles"] = "on";
  } else if (presetVisual) {
    attrs["data-preset-particles"] = "off";
  }

  if (presetVisual?.metrics.animatedEffectsEnabled) {
    attrs["data-preset-animated"] = "on";
  } else if (presetVisual) {
    attrs["data-preset-animated"] = "off";
  }

  const cursorOn =
    visual.cursorEnabled &&
    Boolean(visual.cursorEffect) &&
    visual.cursorEffect !== "default" &&
    visual.cursorEffect !== "none";
  attrs["data-site-cursor-effects"] = cursorOn ? "on" : "off";

  if (appearance.resolved === "dark") {
    attrs.class = "dark";
  }

  const { bodyFont, headingFont } = config.typography;
  const fonts = resolveNextFonts(bodyFont, headingFont);
  if (fonts.classNames) {
    attrs.class = [attrs.class, fonts.classNames].filter(Boolean).join(" ");
  }

  return attrs;
}

/** Pass-through for spreading onto `<html>` (keys are already `data-*` formatted). */
export function htmlAttributesToReactProps(
  attrs: Record<string, string>,
): Record<string, string> {
  const { class: themeClass, ...rest } = attrs;
  if (themeClass) {
    return { ...rest, className: themeClass };
  }
  return rest;
}

export type BuildResolvedThemeOptions = {
  tokens: ThemeTokens;
  presetDefinition?: PresetDefinition | null;
  visitor?: ThemeSourceInput["visitor"];
  prefersDark?: boolean;
};

/** Synchronous resolver when preset definition is already loaded. */
export function buildResolvedThemeSync(
  options: BuildResolvedThemeOptions,
): ResolvedTheme {
  const { tokens, presetDefinition, visitor, prefersDark } = options;

  const config = mergeThemeSources({
    site: tokens,
    preset: presetDefinition ?? undefined,
    visitor,
  });

  const resolvedTokens = resolveThemeTokens(config);
  const visual = resolveVisualExperience({ site: resolvedTokens });
  const presetVisual = presetDefinition
    ? resolvePresetVisual(presetDefinition)
    : null;
  const motion = resolveMotion(config);

  const appearanceMode =
    visitor?.appearanceMode ?? config.appearance.defaultMode;
  const resolved = resolveAppearance(appearanceMode, { prefersDark });

  const cardStyle = visual.cardStyle ?? presetVisual?.cardStyle ?? config.cards.style;
  const borderStyle =
    visual.borderStyle ?? presetVisual?.borderStyle ?? config.borders.style;

  const htmlAttributes = generateHtmlAttributes({
    config,
    visual,
    presetVisual,
    motion,
    appearance: { mode: appearanceMode, resolved },
  });

  const motionVars = buildMotionCssVars(motion);

  return {
    tokens: resolvedTokens,
    config,
    appearance: { mode: appearanceMode, resolved },
    motion,
    cardStyle,
    borderStyle,
    preset: {
      presetId: presetVisual?.presetId ?? config.presets.activePresetId,
      preset: config.presets.preset,
      name: presetVisual?.name ?? null,
    },
    visual,
    presetVisual,
    css: {
      theme: buildThemeCss(resolvedTokens),
      presetVisual: presetVisual ? presetVisualToCssBlock(presetVisual) : "",
      vars: motionVars,
    },
    htmlAttributes,
  };
}

