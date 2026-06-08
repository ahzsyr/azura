"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  getCapabilities,
  subscribeCapabilityChanges,
} from "@/lib/theme/effects/capability-engine";
import type { CapabilityPolicy, DeviceCapabilities } from "@/lib/theme/effects/types";

export const ADMIN_MOTION_MOBILE = {
  ease: [0.22, 1, 0.36, 1] as const,
  enterDuration: 0.12,
  exitDuration: 0.1,
} as const;

export type ConstrainedMotionState = {
  shouldReduceMotion: boolean;
  shouldSimplifyMotion: boolean;
  allowStagger: boolean;
  capabilities: DeviceCapabilities;
  policy: CapabilityPolicy;
};

function readMotionState(osReduced: boolean): ConstrainedMotionState {
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

/** Capability-aware motion gating (OS reduced-motion + touch/small-screen + paint tier). */
export function useConstrainedMotion(): ConstrainedMotionState {
  const osReduced = useReducedMotion() ?? false;
  const [state, setState] = useState<ConstrainedMotionState>(() =>
    typeof window === "undefined"
      ? {
          shouldReduceMotion: osReduced,
          shouldSimplifyMotion: false,
          allowStagger: !osReduced,
          capabilities: {
            prefersReducedMotion: osReduced,
            lowEndDevice: false,
            touchOnly: false,
            smallScreen: false,
            hardwareConcurrency: 8,
            deviceMemoryGb: null,
            effectiveConnection: null,
          },
          policy: {
            allowHeavy: true,
            allowMedium: true,
            allowCustomCursor: true,
            allowAnimatedBackground: true,
            allowTextAnimation: true,
            allowMotion: !osReduced,
            allowStagger: !osReduced,
          },
        }
      : readMotionState(osReduced),
  );

  useEffect(() => {
    setState(readMotionState(osReduced));
    return subscribeCapabilityChanges(() => {
      setState(readMotionState(osReduced));
    });
  }, [osReduced]);

  return state;
}

/** Non-hook read for scroll observers and effects. */
export function getConstrainedMotionSnapshot(): Pick<
  ConstrainedMotionState,
  "shouldReduceMotion" | "shouldSimplifyMotion" | "allowStagger"
> {
  if (typeof window === "undefined") {
    return {
      shouldReduceMotion: false,
      shouldSimplifyMotion: false,
      allowStagger: true,
    };
  }
  const osReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { shouldReduceMotion, shouldSimplifyMotion, allowStagger } = readMotionState(osReduced);
  return { shouldReduceMotion, shouldSimplifyMotion, allowStagger };
}
