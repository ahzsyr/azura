import { auroraEffect } from "./effects/aurora";
import { bubblesEffect } from "./effects/bubbles";
import { circuitEffect } from "./effects/circuit";
import { geometricEffect } from "./effects/geometric";
import { gridEffect } from "./effects/grid";
import { vortexEffect } from "./effects/vortex";
import type { BackgroundEffectDefinition, BackgroundEffectId } from "./types";

const EAGER_EFFECTS: BackgroundEffectDefinition[] = [gridEffect, auroraEffect];

const registry = new Map<BackgroundEffectId, BackgroundEffectDefinition>();

for (const effect of EAGER_EFFECTS) {
  registry.set(effect.id, effect);
}

export function registerEffect(definition: BackgroundEffectDefinition): void {
  registry.set(definition.id, definition);
}

export function getEffect(id: BackgroundEffectId): BackgroundEffectDefinition | undefined {
  return registry.get(id);
}

export function listEffects(): BackgroundEffectDefinition[] {
  return Array.from(registry.values());
}

export function isEffectRegistered(id: BackgroundEffectId): boolean {
  return registry.has(id);
}
