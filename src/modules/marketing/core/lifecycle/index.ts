import type { ProviderLifecycleState } from "@/modules/marketing/core/manifests/types";

const TRANSITIONS: Record<ProviderLifecycleState, ProviderLifecycleState[]> = {
  discovered: ["configured", "disabled", "retired"],
  configured: ["connected", "disabled", "retired"],
  connected: ["healthy", "degraded", "disconnected", "disabled"],
  healthy: ["degraded", "disconnected", "disabled"],
  degraded: ["healthy", "disconnected", "disabled"],
  disconnected: ["connected", "disabled", "retired"],
  disabled: ["configured", "retired"],
  retired: [],
};

export function canTransitionLifecycle(
  from: ProviderLifecycleState,
  to: ProviderLifecycleState,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertLifecycleTransition(
  from: ProviderLifecycleState,
  to: ProviderLifecycleState,
): void {
  if (!canTransitionLifecycle(from, to)) {
    throw new Error(`Invalid provider lifecycle transition: ${from} -> ${to}`);
  }
}

export function nextLifecycleOnHealth(ok: boolean, current: ProviderLifecycleState): ProviderLifecycleState {
  if (current === "disabled" || current === "retired") return current;
  if (!ok) {
    if (current === "connected" || current === "healthy" || current === "degraded") return "degraded";
    return current;
  }
  if (current === "connected" || current === "degraded" || current === "healthy") return "healthy";
  return current;
}
