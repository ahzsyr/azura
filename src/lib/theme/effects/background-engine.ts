import {
  applyGlassSiteOverlay,
  applySiteBackground,
  clearSiteBackground,
  downgradeSiteBackgroundForPolicy,
} from "@/features/theme/backgrounds/background-system";
import { SHELL_READY_EVENT, whenShellReady } from "@/lib/motion/shell-ready";
import type { CapabilityPolicy, EffectModule, EffectRuntimeConfig } from "./types";

let activeEffectId: string | null = null;
let shellReadyBound = false;

function isShellPreloading(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("site-preloading");
}

function applySiteBackgroundWhenReady(effectId: string | null, options?: { force?: boolean }): void {
  const run = () => applySiteBackground(effectId, options);
  if (isShellPreloading()) {
    whenShellReady(run);
    return;
  }
  run();
}

function bindShellReadyRefresh(): void {
  if (shellReadyBound || typeof document === "undefined") return;
  shellReadyBound = true;
  document.addEventListener(SHELL_READY_EVENT, () => {
    if (activeEffectId) {
      applySiteBackground(activeEffectId);
    }
  });
}

export const backgroundEngine: EffectModule = {
  initialize() {
    activeEffectId = null;
    bindShellReadyRefresh();
  },

  update(config: EffectRuntimeConfig, policy: CapabilityPolicy) {
    if (typeof document === "undefined") return;

    applyGlassSiteOverlay(config.glassOverlay);

    if (!config.background.enabled) {
      applySiteBackgroundWhenReady("none");
      activeEffectId = null;
      return;
    }

    const effectId = downgradeSiteBackgroundForPolicy(config.background.effectId, policy);
    if (effectId === activeEffectId) {
      return;
    }

    activeEffectId = effectId;
    applySiteBackgroundWhenReady(effectId);
  },

  destroy() {
    activeEffectId = null;
    clearSiteBackground();
    applyGlassSiteOverlay(false);
  },
};
