import type { CSSProperties } from "react";
import { initBackground, initSectionBackgroundLayer } from "@/features/theme/effects/backgrounds";
import type { BlockSectionBackground } from "@/types/block-system";

export type SiteBackgroundEffect =
  | "none"
  | "grid"
  | "particles"
  | "waves"
  | "stars"
  | "matrix"
  | "aurora"
  | "noise"
  | "hexagons"
  | "circuit"
  | "bubbles"
  | "geometric"
  | "vortex";

/** Section / block background kinds */
export type SectionBackgroundType =
  | "none"
  | "color"
  | "gradient"
  | "image"
  | "pattern"
  | "particles"
  | "grid"
  | "glass";

const ANIMATED_SITE_EFFECTS = new Set<SiteBackgroundEffect>([
  "particles",
  "waves",
  "stars",
  "matrix",
  "noise",
  "hexagons",
  "circuit",
  "bubbles",
  "geometric",
  "vortex",
]);

const STATIC_SITE_EFFECTS = new Set<SiteBackgroundEffect>(["grid", "aurora"]);

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let activeSiteEffect: string | null = null;
let glassOverlayOn = false;

export function normalizeSiteBackgroundEffect(value: string | null | undefined): SiteBackgroundEffect {
  const v = value?.trim() || "none";
  const allowed: SiteBackgroundEffect[] = [
    "none",
    "grid",
    "particles",
    "waves",
    "stars",
    "matrix",
    "aurora",
    "noise",
    "hexagons",
    "circuit",
    "bubbles",
    "geometric",
    "vortex",
  ];
  return allowed.includes(v as SiteBackgroundEffect) ? (v as SiteBackgroundEffect) : "none";
}

export function applyGlassSiteOverlay(enabled: boolean): void {
  if (typeof document === "undefined") return;
  glassOverlayOn = enabled;
  if (enabled) {
    document.documentElement.dataset.glassOverlay = "on";
  } else {
    delete document.documentElement.dataset.glassOverlay;
  }
}

/**
 * Global site canvas background (fixed layer on body) — Astro site-layout-client parity.
 */
export function applySiteBackground(
  effect: string | null | undefined,
  options?: { animationsEnabled?: boolean; force?: boolean },
): void {
  if (typeof document === "undefined") return;

  const normalized = normalizeSiteBackgroundEffect(effect);
  const animationsEnabled = options?.animationsEnabled !== false;
  const reduced = prefersReducedMotion();

  if (!options?.force && activeSiteEffect === normalized) {
    return;
  }

  activeSiteEffect = normalized;
  document.body.dataset.bgEffect = normalized === "none" ? "" : normalized;
  if (normalized === "none" || !normalized) {
    document.body.removeAttribute("data-bg-effect");
    initBackground("none");
    return;
  }

  document.body.dataset.bgEffect = normalized;

  if (reduced) {
    if (STATIC_SITE_EFFECTS.has(normalized)) {
      initBackground(normalized);
    } else {
      initBackground("none");
    }
    return;
  }

  if (animationsEnabled || STATIC_SITE_EFFECTS.has(normalized)) {
    initBackground(normalized);
    return;
  }

  if (STATIC_SITE_EFFECTS.has(normalized)) {
    initBackground(normalized);
  } else {
    initBackground("none");
  }
}

export function clearSiteBackground(): void {
  activeSiteEffect = null;
  applySiteBackground("none", { force: true });
  applyGlassSiteOverlay(false);
}

export function sectionBackgroundToCss(bg: BlockSectionBackground | undefined): CSSProperties {
  if (!bg?.type || bg.type === "none") return {};
  if (bg.type === "color" && bg.color) return { backgroundColor: bg.color };
  if (bg.type === "gradient" && bg.gradient) return { background: bg.gradient };
  return {};
}

export function sectionBackgroundUsesLayer(bg: BlockSectionBackground | undefined): boolean {
  if (!bg?.type || bg.type === "none") return false;
  return bg.type === "image" || bg.type === "pattern" || bg.type === "particles" || bg.type === "grid" || bg.type === "glass";
}

export function resolveSectionPatternEffect(
  bg: BlockSectionBackground | undefined,
): SiteBackgroundEffect | null {
  if (!bg?.type) return null;
  if (bg.type === "grid" || (bg.type === "pattern" && bg.pattern === "grid")) return "grid";
  if (bg.type === "particles" || (bg.type === "pattern" && bg.pattern === "particles"))
    return "particles";
  if (bg.type === "pattern" && bg.pattern) {
    const p = normalizeSiteBackgroundEffect(bg.pattern);
    return p === "none" ? null : p;
  }
  return null;
}

export function mountSectionAnimatedBackground(
  container: HTMLElement,
  effect: SiteBackgroundEffect,
): () => void {
  return initSectionBackgroundLayer(container, effect);
}

export { ANIMATED_SITE_EFFECTS, STATIC_SITE_EFFECTS };
