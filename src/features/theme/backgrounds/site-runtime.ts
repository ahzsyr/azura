import { restorePresetColorsFromStorage } from "@/features/theme/engine";
import { ensureBgKeyframes } from "./kernel/keyframe-styles";
import { loadEffect } from "./lazy-imports";
import { getEffect } from "./registry";
import { createMountContext, createScope, destroyScope } from "./mount-context";
import { runtimeConfigSignature } from "./config-reader";
import type { BackgroundEffectId, BackgroundRuntimeConfig } from "./types";

let activeEffectId: BackgroundEffectId | "none" | null = null;
let activeConfigSig: string | null = null;
let cleanup: (() => void) | null = null;
let activeHost: HTMLElement | null = null;
/** Serializes async mounts so concurrent callers cannot tear down an in-flight canvas. */
let mountChain: Promise<void> = Promise.resolve();

function clearHostLayers(host: HTMLElement): void {
  host.querySelectorAll("[data-bg-effect], canvas[data-bg-effect]").forEach((el) => el.remove());
}

function reassertDarkSurfaces(): void {
  const resolved = document.documentElement.dataset.theme;
  if (resolved === "dark" || resolved === "light") {
    restorePresetColorsFromStorage(resolved);
  }
}

async function mountEffectOnHost(
  host: HTMLElement,
  effectId: BackgroundEffectId,
  config?: Partial<BackgroundRuntimeConfig>,
): Promise<void> {
  ensureBgKeyframes(config?.speed ?? 1);
  const scope = createScope("site", host);
  const trackMouse = effectId === "particles";
  const ctx = createMountContext(scope, config, { trackMouse });
  const definition = getEffect(effectId) ?? (await loadEffect(effectId));
  if (!definition) return;

  cleanup?.();
  clearHostLayers(host);

  const effectCleanup = definition.mount(ctx);
  cleanup = () => {
    effectCleanup();
    destroyScope(scope, { trackMouse });
    cleanup = null;
  };
  reassertDarkSurfaces();
}

export async function mountSiteBackground(
  host: HTMLElement,
  effectId: BackgroundEffectId | "none",
  config?: Partial<BackgroundRuntimeConfig>,
  options?: { force?: boolean },
): Promise<void> {
  if (typeof document === "undefined") return;

  activeHost = host;
  const configSig = runtimeConfigSignature({
    intensity: config?.intensity ?? 1,
    opacity: config?.opacity ?? 1,
    speed: config?.speed ?? 1,
    animationsEnabled: config?.animationsEnabled ?? true,
    colors: config?.colors,
  });

  const run = async () => {
    if (!options?.force && activeEffectId === effectId && activeConfigSig === configSig) {
      return;
    }

    cleanup?.();
    clearHostLayers(host);

    if (!effectId || effectId === "none") {
      activeEffectId = "none";
      activeConfigSig = configSig;
      document.documentElement.removeAttribute("data-bg-canvas-ready");
      return;
    }

    await mountEffectOnHost(host, effectId, config);
    activeEffectId = effectId;
    activeConfigSig = configSig;
    document.documentElement.setAttribute("data-bg-canvas-ready", "true");
  };

  mountChain = mountChain.then(run);
  return mountChain;
}

export function updateSiteBackgroundSettings(config: Partial<BackgroundRuntimeConfig>): void {
  if (!activeHost || !activeEffectId || activeEffectId === "none") return;
  void mountSiteBackground(activeHost, activeEffectId, config, { force: true });
}

export function unmountSiteBackground(): void {
  cleanup?.();
  if (activeHost) clearHostLayers(activeHost);
  activeEffectId = null;
  activeConfigSig = null;
  activeHost = null;
  mountChain = Promise.resolve();
  document.documentElement.removeAttribute("data-bg-canvas-ready");
}

export function getActiveSiteBackgroundEffect(): BackgroundEffectId | "none" | null {
  return activeEffectId;
}

/** True when no site canvas is required, or the active effect canvas has finished mounting. */
export function isSiteBackgroundCanvasReady(): boolean {
  if (typeof document === "undefined") return false;
  const effect = document.body.getAttribute("data-bg-effect");
  if (!effect || effect === "none") return true;
  if (document.documentElement.getAttribute("data-bg-canvas-ready") === "true") return true;
  return !!document.querySelector("canvas[data-bg-effect]");
}
