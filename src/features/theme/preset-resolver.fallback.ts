import type { PresetDefinition } from "./preset-resolver.types";

export function resolveCloudPresetFromSources(input: {
  requestedId: string;
  storePreset: PresetDefinition | null;
  bundled: Record<string, PresetDefinition>;
}): PresetDefinition | null {
  if (input.storePreset) return input.storePreset;
  return input.bundled[input.requestedId] ?? null;
}

export function resolvePresetCandidate(input: {
  candidateId: string;
  candidatePreset: PresetDefinition | null;
  fallbackId: string;
  fallbackPreset: PresetDefinition | null;
}): { preset: PresetDefinition; activeId: string } | null {
  if (input.candidatePreset) {
    return {
      preset: input.candidatePreset,
      activeId: input.candidatePreset.id?.trim() || input.candidateId,
    };
  }
  if (input.fallbackPreset) {
    return {
      preset: input.fallbackPreset,
      activeId: input.fallbackPreset.id?.trim() || input.fallbackId,
    };
  }
  return null;
}
