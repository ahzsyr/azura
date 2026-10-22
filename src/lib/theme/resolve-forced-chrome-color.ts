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
 * Luminance safety only — not an active-color source.
 *
 * Prefer callers that omit `visitorColors` / `computedBg` and pass boot/SSR
 * projection fallbacks. Active chrome must come from
 * `resolveBrowserProjection` + `activeBrowserThemeColor`; use this helper only
 * when a projected dark color is still light (or the inverse safety case).
 *
 * Legacy branches (visitor surface, computed CSS) remain for older tests and
 * must not be used from ThemeEngineProvider.
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
