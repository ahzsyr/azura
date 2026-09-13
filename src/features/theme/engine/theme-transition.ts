import type { AppearanceMode, ResolvedAppearance } from "./types";
import { ADMIN_THEME_KEY, PUBLIC_THEME_KEY } from "./constants";
import { runWithCssThemeTransition } from "@/lib/theme/effects/transition-engine";
import { readStoredAppearanceMode, resolveAppearance } from "./appearance";

export { ADMIN_THEME_KEY, PUBLIC_THEME_KEY };

export type ThemeMode = AppearanceMode;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setThemeWithTransition(
  setTheme: (theme: AppearanceMode) => void,
  next: AppearanceMode,
): void {
  const apply = () => setTheme(next);

  if (prefersReducedMotion()) {
    apply();
    return;
  }

  // CSS-only — avoid document.startViewTransition (full-page snapshot lag).
  runWithCssThemeTransition(apply);
}

/**
 * @deprecated Prefer `readStoredAppearanceMode` + `resolveAppearance`.
 * Kept as a thin fold for legacy imports.
 */
export function resolveStoredTheme(
  storageKey: string,
  enableSystem: boolean,
): ResolvedAppearance {
  const stored = readStoredAppearanceMode(storageKey);
  if (!stored) return "light";
  if (stored === "system" && !enableSystem) return "light";
  return resolveAppearance(stored);
}

export function applyThemeToDocument(resolved: ResolvedAppearance): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (resolved === "dark") {
    root.classList.add("dark");
  }
  root.style.colorScheme = resolved;
}
