import { sessionDebugLog } from "@/lib/debug/session-log";
import type { EffectModule, EffectRuntimeConfig } from "./types";
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

  const selection = window.getSelection();
  sessionDebugLog(
    "transition-engine.ts:runWithViewTransition",
    "starting view transition",
    {
      pathname: window.location.pathname,
      selectionType: selection?.type,
      selectionRangeCount: selection?.rangeCount ?? 0,
      handoff: document.documentElement.dataset.sharedElementHandoff,
    },
    "A",
  );

  document.documentElement.classList.add("theme-transitioning");
  transitionClassApplied = true;

  const transition = document.startViewTransition(() => {
    sessionDebugLog(
      "transition-engine.ts:startViewTransition-callback",
      "view transition DOM update",
      { pathname: window.location.pathname },
      "A",
    );
    update();
  });

  void transition.finished
    .catch((error: unknown) => {
      const isSkipped =
        error instanceof DOMException && error.name === "AbortError";
      sessionDebugLog(        "transition-engine.ts:viewTransition-aborted",
        isSkipped ? "view transition skipped" : "view transition failed",
        {
          pathname: window.location.pathname,
          name: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
        },
        "A",
      );
    })
    .finally(() => {
      sessionDebugLog(
        "transition-engine.ts:viewTransition-finished",
        "view transition finished",
        { pathname: window.location.pathname },
        "A",
      );
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
