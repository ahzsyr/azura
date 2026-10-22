/**
 * Site Liquid Glass fill colour — distinct from the page canvas (`--bg-primary`)
 * and from OS chrome Theme Color. Apple materials need a tint that is not the
 * same identity as the backdrop, or translucency collapses to a flat wash.
 *
 * Light: elevated surface (#ffffff family), not the field (#fafafa / #f8fafc).
 * Dark: elevated surface (#0a0f18 family), never a light value.
 */

import type { ResolvedAppearance } from "@/features/theme/engine/types";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import {
  DEFAULT_DARK_SURFACES,
  DEFAULT_LIGHT_SURFACES,
  isLightBackground,
  resolveThemeSurfaces,
} from "@/features/theme/surfaces/theme-surfaces";
import { coerceColorString } from "@/lib/theme/tokens/color-utils";

export type SiteGlassTintPair = {
  light: string;
  dark: string;
};

/** Prefer surface over background; fall back to defaults when they collide. */
function distinctSurface(
  surface: string,
  background: string,
  fallback: string,
): string {
  const s = coerceColorString(surface)?.toLowerCase() ?? surface.toLowerCase();
  const b =
    coerceColorString(background)?.toLowerCase() ?? background.toLowerCase();
  if (!s || s === b) return fallback;
  return coerceColorString(surface) ?? fallback;
}

/**
 * Resolve the light/dark glass fill pair from preset surfaces (card/surface role).
 * Does not mutate page background tokens.
 */
export function resolveSiteGlassTintPair(
  colors?: PresetColorTokens | null,
  primary: string = DEFAULT_LIGHT_SURFACES.text,
): SiteGlassTintPair {
  const lightSurfaces = resolveThemeSurfaces(colors, "light", primary);
  const darkSurfaces = resolveThemeSurfaces(colors, "dark", primary);

  let light = distinctSurface(
    lightSurfaces.surface,
    lightSurfaces.background,
    DEFAULT_LIGHT_SURFACES.surface,
  );
  let dark = distinctSurface(
    darkSurfaces.surface,
    darkSurfaces.background,
    DEFAULT_DARK_SURFACES.surface,
  );

  // Appearance lock: light slot must stay light; dark slot must stay dark.
  if (!isLightBackground(light)) {
    light = DEFAULT_LIGHT_SURFACES.surface;
  }
  if (isLightBackground(dark)) {
    dark = DEFAULT_DARK_SURFACES.surface;
  }

  return { light, dark };
}

export function activeSiteGlassTint(
  pair: SiteGlassTintPair,
  resolved: ResolvedAppearance,
): string {
  return resolved === "dark" ? pair.dark : pair.light;
}
