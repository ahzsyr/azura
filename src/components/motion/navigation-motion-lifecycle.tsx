"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { useVisualExperience } from "@/components/theme/visual-experience-context";
import { useThemeEngine } from "@/components/theme/theme-engine-provider";
import { resolveVisitorVisualExperience } from "@/features/theme/visual-experience-resolver";
import {
  readStoredPresetEffects,
  syncThemeDataAttributes,
  resolveAppearance,
  PUBLIC_THEME_KEY,
  readStoredAppearanceMode,
  hasVisitorThemeOverrides,
  applySiteThemeColors,
} from "@/features/theme/engine";
import { CURSOR_PREF_STORAGE_KEY } from "@/features/theme/engine/constants";
import { scheduleApplyVisualEffects } from "@/features/theme/visual-effects-coordinator";
import { initStaggeredReveal } from "@/lib/motion/staggered-reveal";
import { RESCAN_REVEAL_EVENT } from "@/lib/motion/shell-ready";

function readCursorPreference(): "custom" | "normal" {
  try {
    const pref = localStorage.getItem(CURSOR_PREF_STORAGE_KEY);
    return pref === "normal" ? "normal" : "custom";
  } catch {
    return "custom";
  }
}

/**
 * Re-init scroll reveal after client navigations without rebuilding canvas effects.
 */
export function NavigationMotionLifecycle() {
  const pathname = usePathname();
  const visualCtx = useVisualExperience();
  const engine = useThemeEngine();
  const isFirstPathRef = useRef(true);

  useEffect(() => {
    if (isFirstPathRef.current) {
      isFirstPathRef.current = false;
      initStaggeredReveal();
      return;
    }

    const storedMode = readStoredAppearanceMode(PUBLIC_THEME_KEY);
    const mode = storedMode ?? engine.appearanceMode;
    const resolved = resolveAppearance(mode);
    syncThemeDataAttributes(mode, resolved);

    initStaggeredReveal();

    const main =
      document.querySelector<HTMLElement>("main.site-main") ??
      document.querySelector<HTMLElement>("main") ??
      document.body;

    main.querySelectorAll<HTMLElement>("[data-reveal], [data-animation], [data-scroll-item]").forEach((el) => {
      if (!el.classList.contains("revealed")) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top >= vh || rect.bottom <= 0) {
        el.classList.remove("revealed");
        el.style.removeProperty("--az-anim-delay");
      }
    });

    document.dispatchEvent(new CustomEvent(RESCAN_REVEAL_EVENT));

    if (visualCtx?.site) {
      // Restore site-default colors for visitors without overrides so the DOM
      // stays aligned with SSR after client navigation.
      if (!hasVisitorThemeOverrides()) {
        applySiteThemeColors(visualCtx.site, resolved);
      }
      const experience = resolveVisitorVisualExperience({
        site: visualCtx.site,
        page: visualCtx.page,
        storedEffects: readStoredPresetEffects(),
        cursorPreference: readCursorPreference(),
      });
      // Route changed: force re-application so newly mounted headings receive text effects.
      scheduleApplyVisualEffects(experience, { force: true });
    }
  }, [pathname, engine.appearanceMode, visualCtx?.site, visualCtx?.page]);

  return null;
}
