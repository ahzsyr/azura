import type { PresetColorTokens } from "@/features/theme/engine/types";
import type { AppearanceMode, ResolvedAppearance } from "@/features/theme/engine/types";
import {
  DEFAULT_DARK_SURFACES,
  DEFAULT_LIGHT_SURFACES,
  isLightBackground,
} from "@/features/theme/surfaces/theme-surfaces";
import { shouldSkipPresetSurfaces } from "@/features/theme/engine/colors";

export type ResolveForcedChromeColorInput = {
  /** Forced light/dark only — callers must not pass system. */
  mode: "light" | "dark";
  visitorColors?: PresetColorTokens | null;
  /** Painted page background after visitor/site CSS bootstrap. */
  computedBg?: string | null;
  ssrLight?: string | null;
  ssrDark?: string | null;
  bootLight?: string | null;
  bootDark?: string | null;
};

/**
 * Forced-appearance chrome color priority (boot + runtime).
 * Mirrored in public/theme-init.js — keep in sync.
 *
 * 1. Visitor preset surface for mode (with skip-surface rule)
 * 2. Computed CSS (matches painted page)
 * 3. Boot projection / SSR media metas
 * 4. DEFAULT surfaces
 */
export function resolveForcedChromeColor(
  input: ResolveForcedChromeColorInput,
): string {
  const mode = input.mode;
  const visitor = input.visitorColors;

  if (visitor) {
    if (shouldSkipPresetSurfaces(visitor, mode)) {
      return DEFAULT_DARK_SURFACES.background;
    }
    const bg = visitor.background?.trim();
    if (bg) {
      if (mode === "light" && isLightBackground(bg)) return bg;
      if (mode === "dark" && !isLightBackground(bg)) return bg;
      // Mode/luminance mismatch: fall through to computed / SSR
    }
  }

  const computed = input.computedBg?.trim();
  if (computed) return computed;

  if (mode === "dark") {
    return (
      input.bootDark?.trim() ||
      input.ssrDark?.trim() ||
      DEFAULT_DARK_SURFACES.background
    );
  }
  return (
    input.bootLight?.trim() ||
    input.ssrLight?.trim() ||
    DEFAULT_LIGHT_SURFACES.background
  );
}

/** Map appearance mode to Forced resolve mode, or null for system. */
export function forcedModeOrNull(
  mode: AppearanceMode,
  resolved: ResolvedAppearance,
): "light" | "dark" | null {
  if (mode === "system") return null;
  if (mode === "light" || mode === "dark") return mode;
  return resolved;
}
