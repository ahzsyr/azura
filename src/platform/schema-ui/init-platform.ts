import { discoverManifests, resetPlatformRegistryForTests } from "./manifests/discover";
import { registerBuiltinStateMachines } from "./state-machine/state-machine";

let bootstrapped = false;

/** Initialize platform registries, manifests, and state machines. Safe to call multiple times. */
export function initializeSchemaUiPlatform(): void {
  if (bootstrapped) return;
  discoverManifests();
  registerBuiltinStateMachines();
  bootstrapped = true;
}

export function resetSchemaUiPlatformForTests(): void {
  bootstrapped = false;
  resetPlatformRegistryForTests();
}

// Auto-init on import in app contexts
initializeSchemaUiPlatform();
