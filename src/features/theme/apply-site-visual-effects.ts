import type { ThemeTokens } from "@/types/theme";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";
import { applyVisualEffects } from "@/features/theme/effects-runtime";
import {
  buildLiveVisualExperience,
  readStoredPresetEffects,
  restorePresetColorsFromStorage,
  type CursorPreference,
  type ResolvedAppearance,
} from "@/features/theme/engine";
import { CURSOR_PREF_STORAGE_KEY } from "@/features/theme/engine/constants";

export function readCursorPreference(): CursorPreference {
  try {
    const pref = localStorage.getItem(CURSOR_PREF_STORAGE_KEY);
    return pref === "normal" ? "normal" : "custom";
  } catch {
    return "custom";
  }
}

export function resolveDomAppearance(): ResolvedAppearance | null {
  if (typeof document === "undefined") return null;
  const fromDom = document.documentElement.dataset.theme;
  if (fromDom === "dark" || fromDom === "light") return fromDom;
  return null;
}

/** Re-apply site-level visual effects from storage (used after page-level overrides). */
export function applySiteVisualEffects(
  site: ThemeTokens,
  baseResolved: ResolvedVisualExperience,
  resolvedAppearance: ResolvedAppearance,
  cursorPref: CursorPreference = readCursorPreference(),
): void {
  restorePresetColorsFromStorage(resolvedAppearance);
  const live = readStoredPresetEffects();
  const experience = live
    ? buildLiveVisualExperience(site, live, cursorPref)
    : baseResolved;
  applyVisualEffects(experience);
}
