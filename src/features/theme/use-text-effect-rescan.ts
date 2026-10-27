"use client";

import { useEffect } from "react";
import { rescanTextEffects } from "@/features/theme/effects-runtime";

/**
 * Apply site/block text effects after paint — never in useLayoutEffect.
 * Layout-phase rescans can clear textContent (typewriter) before sibling /
 * selective hydration finishes, which surfaces as React #418.
 */
export function useTextEffectRescan(
  textEffect: string | null | undefined,
  animationsEnabled = true,
): void {
  useEffect(() => {
    if (!animationsEnabled) return;
    rescanTextEffects(textEffect, animationsEnabled);
  }, [textEffect, animationsEnabled]);
}
