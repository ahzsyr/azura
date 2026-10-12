export type FeatureToggle = {
  kind: "module" | "preset";
  featureId: string;
  enabled: boolean;
};

export type ManifestDeps = {
  id: string;
  requiredPresets: readonly string[];
};

function featureKey(kind: string, featureId: string) {
  return `${kind}:${featureId}`;
}

/**
 * One save enables an app together with the presets it requires.
 * Turning a required preset off also turns off apps that still need it.
 * The returned list is every flag that differs from the current map.
 */
export function expandFeatureToggles(input: {
  requested: readonly FeatureToggle[];
  current: ReadonlyMap<string, boolean>;
  manifests: readonly ManifestDeps[];
  includedModules: readonly string[];
  includedPresets: readonly string[];
}): FeatureToggle[] {
  const next = new Map(input.current);
  const requested = new Map(input.requested.map((change) => [featureKey(change.kind, change.featureId), change.enabled]));
  for (const change of input.requested) {
    next.set(featureKey(change.kind, change.featureId), change.enabled);
  }

  for (const manifest of input.manifests) {
    if (!input.includedModules.includes(manifest.id)) continue;
    const moduleKey = featureKey("module", manifest.id);
    if (next.get(moduleKey) !== true) continue;
    let blocked = false;
    for (const presetId of manifest.requiredPresets) {
      if (!input.includedPresets.includes(presetId)) continue;
      const presetKey = featureKey("preset", presetId);
      if (requested.get(presetKey) === false && requested.get(moduleKey) !== true) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      next.set(moduleKey, false);
      continue;
    }
    for (const presetId of manifest.requiredPresets) {
      if (!input.includedPresets.includes(presetId)) continue;
      next.set(featureKey("preset", presetId), true);
    }
  }

  const writes: FeatureToggle[] = [];
  for (const [key, enabled] of next) {
    if (input.current.get(key) === enabled) continue;
    const split = key.indexOf(":");
    const kind = key.slice(0, split);
    if (kind !== "module" && kind !== "preset") continue;
    writes.push({ kind, featureId: key.slice(split + 1), enabled });
  }
  return writes;
}
