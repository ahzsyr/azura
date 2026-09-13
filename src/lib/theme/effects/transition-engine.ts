import type { EffectModule, EffectRuntimeConfig } from "./types";

let transitionClassApplied = false;
let transitionClearTimer: ReturnType<typeof setTimeout> | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type ThemeTransitionOptions = {
  onFinished?: () => void;
  durationMs?: number;
};

function clearThemeTransitioning(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("theme-transitioning");
  transitionClassApplied = false;
  if (transitionClearTimer != null) {
    clearTimeout(transitionClearTimer);
    transitionClearTimer = null;
  }
}

/**
 * Fast appearance flip: CSS transitions only — no View Transition API snapshots.
 * `startViewTransition` captures the full document and makes toggles feel lagged.
 */
export function runWithCssThemeTransition(
  update: () => void,
  options?: ThemeTransitionOptions,
): void {
  if (prefersReducedMotion() || typeof document === "undefined") {
    update();
    options?.onFinished?.();
    return;
  }

  if (transitionClearTimer != null) {
    clearTimeout(transitionClearTimer);
    transitionClearTimer = null;
  }

  const root = document.documentElement;
  root.classList.add("theme-transitioning");
  transitionClassApplied = true;
  update();

  const durationMs = options?.durationMs ?? 120;
  transitionClearTimer = setTimeout(() => {
    clearThemeTransitioning();
    options?.onFinished?.();
  }, durationMs);
}

/** @deprecated Prefer runWithCssThemeTransition for appearance toggles. */
export function runWithViewTransition(
  update: () => void,
  options?: { onFinished?: () => void },
): void {
  runWithCssThemeTransition(update, options);
}

export const transitionEngine: EffectModule = {
  initialize() {
    transitionClassApplied = false;
  },

  update(_config: EffectRuntimeConfig) {
    // Transitions are invoked explicitly via runWithCssThemeTransition.
  },

  destroy() {
    clearThemeTransitioning();
  },
};
