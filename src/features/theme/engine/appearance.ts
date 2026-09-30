import type { AppearanceMode, ResolvedAppearance } from "./types";
import {
  DEFAULT_DARK_SURFACES,
  DEFAULT_LIGHT_SURFACES,
} from "@/features/theme/surfaces/theme-surfaces";
import { resolveAppearance } from "@/lib/theme/resolve-appearance";
import { syncSafariChromeTint } from "@/lib/theme/safari-chrome-tint";

export { resolveAppearance } from "@/lib/theme/resolve-appearance";

/**
 * Primary toggle cycle: light ↔ dark.
 * From `system`, jump to the opposite of the resolved OS appearance so one
 * press always visibly changes the page. System mode is set only via an
 * explicit control (e.g. personalization System chip).
 */
export function nextAppearanceMode(
  current: AppearanceMode,
  resolved?: ResolvedAppearance,
): AppearanceMode {
  if (current === "system") {
    const active = resolved ?? resolveAppearance("system");
    return active === "dark" ? "light" : "dark";
  }
  return current === "dark" ? "light" : "dark";
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

export function readDocumentThemeBackground(): string {
  if (typeof document === "undefined") return "";
  const styles = getComputedStyle(document.documentElement);
  return (
    styles.getPropertyValue("--az-bg-primary").trim() ||
    styles.getPropertyValue("--background").trim()
  );
}

export type SyncThemeColorMetaOptions = {
  /** Explicit active surface color from browser projection (preferred). */
  color?: string;
  /** Appearance mode — forced light/dark collapses metas; system keeps media split. */
  mode?: AppearanceMode;
  lightColor?: string;
  darkColor?: string;
};

function setMetaContent(meta: HTMLMetaElement, content: string): void {
  if (meta.content !== content) {
    meta.content = content;
  }
}

function mediaLooksLight(media: string | null): boolean {
  if (!media) return false;
  return /prefers-color-scheme:\s*light/i.test(media);
}

function mediaLooksDark(media: string | null): boolean {
  if (!media) return false;
  return /prefers-color-scheme:\s*dark/i.test(media);
}

/**
 * Update the browser's `<meta name="theme-color">` elements for the active
 * appearance, and project the same paint to Safari 26+ edge sampling
 * (`syncSafariChromeTint`).
 *
 * Next.js SSR emits media-query-scoped theme-color tags via generateViewport.
 * Those nodes must be updated in place — removing them orphans React head
 * fibers and causes removeChild crashes during reconciliation.
 *
 * Colors MUST come from resolver / browser projection options. Computed CSS
 * is last-resort only (zero-trust audit I3).
 */
// Part of the exclusive browser chrome meta writer set. See docs/browser-chrome-theme-sync.md.
export function syncThemeColorMeta(
  resolved?: ResolvedAppearance,
  options?: SyncThemeColorMetaOptions,
): void {
  if (typeof document === "undefined") return;

  const mode = options?.mode;
  const lightColor =
    options?.lightColor?.trim() || DEFAULT_LIGHT_SURFACES.background;
  const darkColor =
    options?.darkColor?.trim() || DEFAULT_DARK_SURFACES.background;
  const activeColor =
    options?.color?.trim() ||
    (resolved === "dark" ? darkColor : lightColor) ||
    readDocumentThemeBackground();

  if (!activeColor) return;

  const existing = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );

  if (existing.length === 0) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = activeColor;
    document.head.appendChild(meta);
    syncSafariChromeTint(activeColor, { lightColor, darkColor });
    return;
  }

  if (mode === "system") {
    for (const meta of existing) {
      const media = meta.getAttribute("media");
      let next = activeColor;
      if (mediaLooksLight(media)) next = lightColor;
      else if (mediaLooksDark(media)) next = darkColor;
      // Unscoped leftover — match resolved appearance
      setMetaContent(meta, next);
    }
    // Safari ignores media-qualified theme-color — paint the resolved active tint.
    syncSafariChromeTint(activeColor, { lightColor, darkColor });
    return;
  }

  // Forced light/dark (or unknown mode): drive all metas to the active color.
  const metasAlreadyMatch = existing.every((meta) => meta.content === activeColor);
  if (!metasAlreadyMatch) {
    existing.forEach((meta) => setMetaContent(meta, activeColor));
  }
  // Always refresh Safari tint — early return on meta content alone skipped iOS.
  syncSafariChromeTint(activeColor, { lightColor, darkColor });
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

/** Persist appearance for SSR Forced projection (mirrors PUBLIC_THEME_KEY). */
export function persistAppearanceModeCookie(mode: AppearanceMode): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `devi-theme-mode=${mode};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    // ignore
  }
}
