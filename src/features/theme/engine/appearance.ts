import type { AppearanceMode, ResolvedAppearance } from "./types";

export function resolveAppearance(mode: AppearanceMode): ResolvedAppearance {
  if (mode === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode === "dark" ? "dark" : "light";
}

/** Sync `data-theme` / `data-theme-mode` for Astro-parity CSS hooks. */
export function syncThemeDataAttributes(
  mode: AppearanceMode,
  resolved: ResolvedAppearance,
): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.dataset.themeMode = mode;
  html.dataset.theme = resolved;
}

export function readStoredAppearanceMode(storageKey: string): AppearanceMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}
