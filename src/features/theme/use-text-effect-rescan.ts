"use client";

import { useLayoutEffect } from "react";
import { rescanTextEffects } from "@/features/theme/effects-runtime";

/** Apply site/block text effects when a target mounts after the global effects pass. */
export function useTextEffectRescan(
  textEffect: string | null | undefined,
  animationsEnabled = true,
): void {
  useLayoutEffect(() => {
    if (!animationsEnabled) return;
    rescanTextEffects(textEffect, animationsEnabled);
  }, [textEffect, animationsEnabled]);
}
