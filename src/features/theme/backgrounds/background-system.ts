import type { CSSProperties } from "react";
import { initBackground, initSectionBackgroundLayer } from "@/features/theme/effects/backgrounds";
import { restorePresetColorsFromStorage } from "@/features/theme/engine";
import { getBackgroundTier } from "@/lib/theme/effects/effect-tiers";
import type { CapabilityPolicy } from "@/lib/theme/effects/types";
import { SHELL_READY_EVENT } from "@/lib/motion/shell-ready";
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

function isConstrainedBackgroundEnvironment(): boolean {
  if (typeof document === "undefined") return prefersReducedMotion();
  const root = document.documentElement;
  return (
    prefersReducedMotion() ||
    root.dataset.reducedPaint === "true" ||
    root.dataset.lowEndDevice === "true" ||
    root.dataset.effectsTier === "light"
  );
}

/** Static CSS/canvas fallback when motion or GPU budget is limited — shared by site + block layers. */
export function resolveConstrainedSiteEffect(effect: SiteBackgroundEffect): SiteBackgroundEffect {
  if (effect === "none") return "none";
  if (STATIC_SITE_EFFECTS.has(effect)) return effect;
  return "grid";
}

/** Policy-aware site background — never returns null for an active effect (falls back to grid). */
export function downgradeSiteBackgroundForPolicy(
  effectId: string | null | undefined,
  policy: CapabilityPolicy,
): SiteBackgroundEffect | null {
  const normalized = normalizeSiteBackgroundEffect(effectId);
  if (normalized === "none") return null;

  if (prefersReducedMotion() || !policy.allowAnimatedBackground) {
    return resolveConstrainedSiteEffect(normalized);
  }

  const tier = getBackgroundTier(normalized);
  if (tier === "heavy" && !policy.allowHeavy) {
    return resolveConstrainedSiteEffect(normalized);
  }
  if (tier === "medium" && !policy.allowMedium && normalized !== "grid") {
    return resolveConstrainedSiteEffect(normalized);
  }

  return normalized;
}

let activeSiteEffect: string | null = null;
let activeAnimationsEnabled = true;
let glassOverlayOn = false;
let shellReadyBound = false;

function bindShellReadyRefresh(): void {
  if (shellReadyBound || typeof document === "undefined") return;
  shellReadyBound = true;
  document.addEventListener(SHELL_READY_EVENT, () => {
    // Canvas is already running — just re-sync colors for the now-visible shell.
    reassertDarkSurfaces();
  });
}

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

function reassertDarkSurfaces(): void {
  const resolved = document.documentElement.dataset.theme;
  if (resolved === "dark" || resolved === "light") {
    restorePresetColorsFromStorage(resolved);
  }
}

function mountBackgroundEffect(normalized: SiteBackgroundEffect): void {
  initBackground(normalized);
  reassertDarkSurfaces();
}

function mountBackgroundEffectWhenReady(normalized: SiteBackgroundEffect): void {
  bindShellReadyRefresh();
  mountBackgroundEffect(normalized);
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
  activeAnimationsEnabled = animationsEnabled;
  const constrained = isConstrainedBackgroundEnvironment();
  const runtimeEffect = constrained ? resolveConstrainedSiteEffect(normalized) : normalized;

  if (!options?.force && activeSiteEffect === runtimeEffect) {
    return;
  }

  activeSiteEffect = runtimeEffect;
  document.body.dataset.bgEffect = runtimeEffect === "none" ? "" : runtimeEffect;
  if (runtimeEffect === "none" || !runtimeEffect) {
    document.body.removeAttribute("data-bg-effect");
    initBackground("none");
    reassertDarkSurfaces();
    return;
  }

  document.body.dataset.bgEffect = runtimeEffect;

  if (constrained) {
    mountBackgroundEffectWhenReady(runtimeEffect);
    return;
  }

  if (animationsEnabled || STATIC_SITE_EFFECTS.has(runtimeEffect)) {
    mountBackgroundEffectWhenReady(runtimeEffect);
    return;
  }

  if (STATIC_SITE_EFFECTS.has(runtimeEffect)) {
    mountBackgroundEffectWhenReady(runtimeEffect);
  } else {
    mountBackgroundEffectWhenReady(resolveConstrainedSiteEffect(runtimeEffect));
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
  const runtimeEffect = isConstrainedBackgroundEnvironment()
    ? resolveConstrainedSiteEffect(effect)
    : effect;
  return initSectionBackgroundLayer(container, runtimeEffect);
}

export { ANIMATED_SITE_EFFECTS, STATIC_SITE_EFFECTS };
