import type { PageTransitionPreset } from "@/features/preloader/page-transitions.schema";
import { PUBLIC_MOTION } from "@/lib/motion/public-motion";

export const PAGE_TRANSITION_EASE = PUBLIC_MOTION.easeCss;

export function normalizePageTransitionPreset(raw: unknown): PageTransitionPreset {
  if (raw === "slide" || raw === "zoom" || raw === "scale" || raw === "none") return raw;
  return "fade";
}

export function clampPageTransitionDurationMs(durationMs: number): number {
  return Math.max(120, Math.min(2000, durationMs));
}

/** CSS custom properties applied on `<html>` for route view transitions. */
export function pageTransitionCssVars(durationMs: number): Record<string, string> {
  const d = clampPageTransitionDurationMs(durationMs);
  return {
    "--page-transition-duration": `${d}ms`,
    "--page-transition-ease": PAGE_TRANSITION_EASE,
  };
}

export function pageTransitionDataAttributes(
  enabled: boolean,
  preset: PageTransitionPreset,
  durationMs: number,
  sharedElementsEnabled = true,
): Record<string, string> {
  if (!enabled || preset === "none") {
    return {
      "data-page-transition": "none",
      "data-page-transition-enabled": "false",
      "data-shared-elements-enabled": "false",
    };
  }
  return {
    "data-page-transition": preset,
    "data-page-transition-enabled": "true",
    "data-page-transition-duration": String(clampPageTransitionDurationMs(durationMs)),
    "data-shared-elements-enabled": sharedElementsEnabled ? "true" : "false",
  };
}
