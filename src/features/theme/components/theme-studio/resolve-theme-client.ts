import { useEffect, useMemo, useState } from "react";
import { presetVisualToCssBlock } from "@/features/theme/presets/preset-visual-css";
import { resolveSyntheticPresetVisual } from "@/features/theme/presets/resolve-preset-visual";
import { buildResolvedThemeSync, type ResolvedTheme } from "@/lib/theme/theme-resolver";
import type { PresetDefinition } from "@/features/theme/preset-resolver.types";
import type { ThemeTokens } from "@/types/theme";

type ApplyPresetPayload = {
  success?: boolean;
  preset?: { id?: string; name?: string };
  colors?: PresetDefinition["colors"];
  cursor?: string | null;
  backgroundEffect?: string | null;
  textEffect?: string | null;
  cardStyle?: string | null;
  borderStyle?: string | null;
  fonts?: PresetDefinition["fonts"] | null;
};

function payloadToPresetDefinition(
  presetId: string,
  payload: ApplyPresetPayload,
): PresetDefinition | null {
  if (!payload.success || !payload.colors) return null;

  return {
    id: payload.preset?.id ?? presetId,
    name: payload.preset?.name ?? presetId,
    colors: payload.colors,
    fonts: payload.fonts ?? undefined,
    cursor: payload.cursor ?? undefined,
    backgroundEffect: payload.backgroundEffect ?? undefined,
    textEffect: payload.textEffect ?? undefined,
    cardStyle: payload.cardStyle ?? undefined,
    borderStyle: payload.borderStyle ?? undefined,
  };
}

function usePresetDefinition(presetId: string | null | undefined): PresetDefinition | null {
  const [state, setState] = useState<{
    presetId: string | null;
    definition: PresetDefinition | null;
  }>({ presetId: null, definition: null });

  useEffect(() => {
    if (!presetId) {
      return;
    }

    const controller = new AbortController();

    void fetch("/api/apply-preset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presetId }),
      signal: controller.signal,
    })
      .then((res) => {
        return res.ok ? res.json() : null;
      })
      .then((payload: ApplyPresetPayload | null) => {
        if (!payload || controller.signal.aborted) return;
        setState({
          presetId,
          definition: payloadToPresetDefinition(presetId, payload),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ presetId, definition: null });
        }
      });

    return () => controller.abort();
  }, [presetId]);

  return presetId && state.presetId === presetId ? state.definition : null;
}

/** Client-side preview resolution from draft tokens. */
export function resolveThemeForPreview(
  tokens: ThemeTokens,
  presetDefinition?: PresetDefinition | null,
): ResolvedTheme {
  const resolved = buildResolvedThemeSync({ tokens, presetDefinition });

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
  const presetDefinition = usePresetDefinition(tokens.siteDefaultPresetId ?? tokens.activePresetId ?? null);
  return useMemo(
    () => resolveThemeForPreview(tokens, presetDefinition),
    [tokens, presetDefinition],
  );
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
