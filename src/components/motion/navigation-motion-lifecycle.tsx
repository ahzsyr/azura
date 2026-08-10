"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { useVisualExperience } from "@/components/theme/visual-experience-context";
import { resolveVisitorVisualExperience } from "@/features/theme/visual-experience-resolver";
import { readStoredPresetEffects } from "@/features/theme/engine";
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
 * Appearance must NOT be repaired here — ThemeEngineProvider is the sole live writer
 * of html class, data-theme*, surface CSS vars, and theme-color meta.
 */
export function NavigationMotionLifecycle() {
  const pathname = usePathname();
  const visualCtx = useVisualExperience();
  const isFirstPathRef = useRef(true);

  useEffect(() => {
    if (isFirstPathRef.current) {
      isFirstPathRef.current = false;
      initStaggeredReveal();
      return;
    }

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
      const experience = resolveVisitorVisualExperience({
        site: visualCtx.site,
        page: visualCtx.page,
        storedEffects: readStoredPresetEffects(),
        cursorPreference: readCursorPreference(),
      });
      // Route changed: re-bind effects on newly mounted headings only.
      scheduleApplyVisualEffects(experience, { force: true });
    }
    // Intentionally pathname-only: never rewrite appearance attrs/meta/colors.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [pathname, visualCtx?.site, visualCtx?.page]);

  return null;
}
