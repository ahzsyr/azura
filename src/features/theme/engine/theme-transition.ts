import type { AppearanceMode, ResolvedAppearance } from "./types";
import { ADMIN_THEME_KEY, PUBLIC_THEME_KEY } from "./constants";
import { runWithViewTransition } from "@/lib/theme/effects/transition-engine";

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

  runWithViewTransition(apply);
}

export function resolveStoredTheme(
  storageKey: string,
  enableSystem: boolean,
): ResolvedAppearance {
  if (typeof window === "undefined") return "light";

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "dark" || stored === "light") return stored;
    if (enableSystem && stored === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch {
    /* ignore */
  }

  return "light";
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
