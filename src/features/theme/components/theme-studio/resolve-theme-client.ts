import { useMemo } from "react";
import { presetVisualToCssBlock } from "@/features/theme/presets/preset-visual-css";
import { resolveSyntheticPresetVisual } from "@/features/theme/presets/resolve-preset-visual";
import { buildResolvedThemeSync, type ResolvedTheme } from "@/lib/theme/theme-resolver";
import type { ThemeTokens } from "@/types/theme";

/** Client-side preview resolution from draft tokens (no preset JSON fetch). */
export function resolveThemeForPreview(tokens: ThemeTokens): ResolvedTheme {
  const resolved = buildResolvedThemeSync({ tokens });

  if (resolved.css.presetVisual) {
    return resolved;
  }

  const synthetic = resolveSyntheticPresetVisual({
    cardStyle: resolved.cardStyle,
    borderStyle: resolved.borderStyle,
    primaryColor: tokens.primaryColor,
    secondaryColor: tokens.secondaryColor,
    accentColor: tokens.presetColors?.accent ?? tokens.secondaryColor,
  });

  if (!synthetic) {
    return resolved;
  }

  return {
    ...resolved,
    presetVisual: synthetic,
    css: {
      ...resolved.css,
      presetVisual: presetVisualToCssBlock(synthetic),
    },
  };
}

export function useResolvedThemePreview(tokens: ThemeTokens): ResolvedTheme {
  return useMemo(() => resolveThemeForPreview(tokens), [tokens]);
}

export function computePerformanceScore(resolved: ResolvedTheme): number {
  let score = 100;
  const { visual, motion, config } = resolved;

  if (!config.motion.animationsEnabled) score += 5;

  if (motion.level === "fast") score -= 12;
  if (motion.level === "off") score += 8;

  const heavyBackgrounds = new Set([
    "particles",
    "stars",
    "matrix",
    "aurora",
    "waves",
    "vortex",
    "hexagons",
  ]);
  if (visual.backgroundEffect && heavyBackgrounds.has(visual.backgroundEffect)) {
    score -= 18;
  } else if (visual.backgroundEffect && visual.backgroundEffect !== "none") {
    score -= 8;
  }

  if (visual.cursorEffect && visual.cursorEffect !== "default" && visual.cursorEffect !== "none") {
    score -= 6;
  }

  if (visual.textEffect && visual.textEffect !== "none") {
    score -= 5;
  }

  if (config.cards.style === "glassmorphism") score -= 8;
  if (config.cards.style === "liquid-glass") score -= 12;

  if (config.layout.spacingScale > 1.2) score -= 3;

  return Math.max(0, Math.min(100, score));
}
