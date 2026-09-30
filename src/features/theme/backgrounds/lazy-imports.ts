import { registerEffect } from "./registry";
import type { BackgroundEffectDefinition, BackgroundEffectId } from "./types";

const HEAVY_EFFECTS = new Set<BackgroundEffectId>([
  "particles",
  "matrix",
  "hexagons",
  "circuit",
  "geometric",
  "vortex",
]);

const MEDIUM_LAZY: BackgroundEffectId[] = ["waves", "stars", "noise", "bubbles"];

const loaders: Partial<Record<BackgroundEffectId, () => Promise<BackgroundEffectDefinition>>> = {
  particles: () => import("./effects/particles").then((m) => m.particlesEffect),
  waves: () => import("./effects/waves").then((m) => m.wavesEffect),
  stars: () => import("./effects/stars").then((m) => m.starsEffect),
  matrix: () => import("./effects/matrix").then((m) => m.matrixEffect),
  noise: () => import("./effects/noise").then((m) => m.noiseEffect),
  hexagons: () => import("./effects/hexagons").then((m) => m.hexagonsEffect),
  circuit: () => import("./effects/circuit").then((m) => m.circuitEffect),
  bubbles: () => import("./effects/bubbles").then((m) => m.bubblesEffect),
  geometric: () => import("./effects/geometric").then((m) => m.geometricEffect),
  vortex: () => import("./effects/vortex").then((m) => m.vortexEffect),
};

const pending = new Map<BackgroundEffectId, Promise<BackgroundEffectDefinition | undefined>>();

export function isLazyEffect(id: BackgroundEffectId): boolean {
  return HEAVY_EFFECTS.has(id) || MEDIUM_LAZY.includes(id);
}

export async function loadEffect(
  id: BackgroundEffectId,
): Promise<BackgroundEffectDefinition | undefined> {
  const { getEffect, isEffectRegistered } = await import("./registry");
  if (isEffectRegistered(id)) return getEffect(id);

  const loader = loaders[id];
  if (!loader) return undefined;

  let promise = pending.get(id);
  if (!promise) {
    promise = loader().then((def) => {
      registerEffect(def);
      pending.delete(id);
      return def;
    });
    pending.set(id, promise);
  }
  return promise;
}
