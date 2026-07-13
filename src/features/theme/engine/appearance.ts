import type { AppearanceMode, ResolvedAppearance } from "./types";

/** Astro header toggle cycle: dark → light → system → dark */
export function nextAppearanceMode(current: AppearanceMode): AppearanceMode {
  if (current === "dark") return "light";
  if (current === "light") return "system";
  return "dark";
}

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

/**
 * Update the browser's `<meta name="theme-color">` element to the appropriate
 * hex value for the currently active appearance mode (light or dark).
 *
 * The SSR layout emits two media-query-scoped entries; this replaces them with
 * a single, unconditional tag that browsers acting on JavaScript updates will
 * respect immediately after a user toggles light/dark mode.
 */
export function syncThemeColorMeta(resolved: ResolvedAppearance): void {
  if (typeof document === "undefined") return;

  // Prefer a selector that matches both light and dark variants; collapse to one.
  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--az-bg-primary").trim();
  if (!bg) return;

  if (existing) {
    existing.content = bg;
    existing.removeAttribute("media");
  } else {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = bg;
    document.head.appendChild(meta);
  }
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
