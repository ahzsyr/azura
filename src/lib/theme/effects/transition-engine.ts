import type { EffectModule, EffectRuntimeConfig } from "./types";
import { postDebugSessionLog } from "@/lib/debug-session-log.client";
let transitionClassApplied = false;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type ViewTransitionOptions = {
  onFinished?: () => void;
};

/** Apply a DOM update inside a view transition when supported. */
export function runWithViewTransition(update: () => void, options?: ViewTransitionOptions): void {
  if (prefersReducedMotion() || typeof document.startViewTransition !== "function") {
    update();
    options?.onFinished?.();
    return;
  }

  // #region agent log H5
  postDebugSessionLog({
    runId: "post-fix",
    hypothesisId: "H5",
    location: "transition-engine.ts:runWithViewTransition",
    message: "Theme view transition started",
    data: {
      pathname: typeof window !== "undefined" ? window.location.pathname : null,
      routeNavigatingClass: document.documentElement.classList.contains("route-navigating"),
      sitePreloadingClass: document.documentElement.classList.contains("site-preloading"),
      transitionClassApplied,
    },
  });
  // #endregion

  document.documentElement.classList.add("theme-transitioning");
  transitionClassApplied = true;

  const transition = document.startViewTransition(() => {
    update();
  });

  void transition.finished.finally(() => {
    document.documentElement.classList.remove("theme-transitioning");
    transitionClassApplied = false;
    options?.onFinished?.();
  });
}

export const transitionEngine: EffectModule = {
  initialize() {
    transitionClassApplied = false;
  },

  update(_config: EffectRuntimeConfig) {
    // Transitions are invoked explicitly via runWithViewTransition on theme/preset changes.
  },

  destroy() {
    if (typeof document !== "undefined" && transitionClassApplied) {
      document.documentElement.classList.remove("theme-transitioning");
      transitionClassApplied = false;
    }
  },
};
