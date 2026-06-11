"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  readMotionState,
  subscribeCapabilityChanges,
  type ConstrainedMotionState,
} from "@/lib/motion/constrained-motion-snapshot";

export const ADMIN_MOTION_MOBILE = {
  ease: [0.22, 1, 0.36, 1] as const,
  enterDuration: 0.12,
  exitDuration: 0.1,
} as const;

export type { ConstrainedMotionState };

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

export { getConstrainedMotionSnapshot } from "@/lib/motion/constrained-motion-snapshot";
