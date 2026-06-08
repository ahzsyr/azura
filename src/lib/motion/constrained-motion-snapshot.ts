import {
  getCapabilities,
  subscribeCapabilityChanges,
} from "@/lib/theme/effects/capability-engine";
import type { CapabilityPolicy, DeviceCapabilities } from "@/lib/theme/effects/types";

export type ConstrainedMotionSnapshot = {
  shouldReduceMotion: boolean;
  shouldSimplifyMotion: boolean;
  allowStagger: boolean;
};

export type ConstrainedMotionState = ConstrainedMotionSnapshot & {
  capabilities: DeviceCapabilities;
  policy: CapabilityPolicy;
};

export function readMotionState(osReduced: boolean): ConstrainedMotionState {
  const { capabilities, policy } = getCapabilities();

  const shouldSimplifyMotion = capabilities.smallScreen || capabilities.touchOnly;
  const shouldReduceMotion =
    osReduced || capabilities.prefersReducedMotion || !policy.allowMotion;

  return {
    shouldReduceMotion,
    shouldSimplifyMotion,
    allowStagger: policy.allowStagger && !shouldReduceMotion,
    capabilities,
    policy,
  };
}

/** Non-hook read for scroll observers and effects — no framer-motion dependency. */
export function getConstrainedMotionSnapshot(): ConstrainedMotionSnapshot {
  if (typeof window === "undefined") {
    return {
      shouldReduceMotion: false,
      shouldSimplifyMotion: false,
      allowStagger: true,
    };
  }
  const osReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { shouldReduceMotion, shouldSimplifyMotion, allowStagger } =
    readMotionState(osReduced);
  return { shouldReduceMotion, shouldSimplifyMotion, allowStagger };
}

export { subscribeCapabilityChanges };
