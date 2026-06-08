import { applySurfaceCssVars } from "@/features/theme/tokens/surface-vars";
import { resolveThemeSurfaces } from "@/features/theme/surfaces/theme-surfaces";
import { invalidateThemeStorageReadCache } from "./storage-read-cache";
import type { PresetColorTokens, ResolvedAppearance } from "./types";

const SHARED_KEYS = [
  "--primary",
  "--accent",
  "--color-primary",
  "--color-accent",
  "--color-secondary",
  "--az-color-primary",
  "--az-color-accent",
  "--az-color-secondary",
  "--az-accent",
] as const;

const SURFACE_OVERRIDE_KEYS = [
  "--az-bg-primary",
  "--az-bg-secondary",
  "--az-text-primary",
  "--az-text-secondary",
  "--az-color-bg",
  "--az-color-surface",
  "--az-color-text",
  "--az-color-muted",
  "--az-text-tertiary",
  "--az-canvas-well",
  "--az-canvas-chrome",
  "--az-border-subtle",
  "--az-color-border",
  "--az-shadow-ambient",
  "--background",
  "--foreground",
  "--card",
  "--color-surface",
  "--sur",
  "--bg",
  "--border",
  "--input",
  "--muted",
  "--muted-foreground",
] as const;

/**
 * Apply preset palette — client-only (guarded for SSR).
 */
export function applyPresetColors(
  colors: PresetColorTokens,
  resolvedAppearance: ResolvedAppearance,
): void {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const primary = colors.primary;
  const accent = colors.accent || colors.primary;
  const secondary = colors.secondary || accent;

  for (const key of SHARED_KEYS) {
    const value =
      key === "--primary" || key === "--color-primary" || key === "--az-color-primary"
        ? primary
        : key === "--accent" ||
            key === "--color-accent" ||
            key === "--az-color-accent" ||
            key === "--az-accent"
          ? accent
          : key === "--color-secondary" || key === "--az-color-secondary"
            ? secondary
            : accent;
    html.style.setProperty(key, value);
  }

  const surfaces = resolveThemeSurfaces(colors, resolvedAppearance, primary);
  applySurfaceCssVars(html, surfaces, primary);
}

export function clearPresetColorOverrides(): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  for (const key of [...SURFACE_OVERRIDE_KEYS, ...SHARED_KEYS]) {
    html.style.removeProperty(key);
  }
  invalidateThemeStorageReadCache();
}
