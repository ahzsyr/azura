import { schemaRegistry } from "../registry/schema-registry";
import { registerBuiltinDataSources } from "../registry/data-source-registry";
import { registerBuiltinDestinations } from "../registry/destination-registry";
import { registerBuiltinValidators } from "../registry/validator-registry";
import { BUILTIN_MANIFESTS } from "./builtin-manifests";
import { PLUGIN_MANIFESTS } from "../plugins";
import type { UIComponentManifest } from "./types";

let initialized = false;

export function registerBuiltinPlatform(
  manifests: UIComponentManifest[] = [...BUILTIN_MANIFESTS, ...PLUGIN_MANIFESTS],
): void {
  if (initialized) return;
  registerBuiltinValidators();
  registerBuiltinDataSources();
  registerBuiltinDestinations();
  schemaRegistry.registerAll(manifests);
  initialized = true;
}

export function discoverManifests(additionalManifests: UIComponentManifest[] = []): UIComponentManifest[] {
  registerBuiltinPlatform();
  if (additionalManifests.length > 0) {
    schemaRegistry.registerAll(additionalManifests);
  }
  return schemaRegistry.listComponents();
}

export function resetPlatformRegistryForTests(): void {
  initialized = false;
}
