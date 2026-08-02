"use client";

import { useLayoutEffect } from "react";
import { rescanTextEffects } from "@/features/theme/effects-runtime";

/** Apply site text effects when a target mounts after the global effects pass. */
export function useTextEffectRescan(
  textEffect: string | null | undefined,
  animationsEnabled = true,
): void {
  useLayoutEffect(() => {
    if (!textEffect || textEffect === "none") return;
    rescanTextEffects(textEffect, animationsEnabled);
  }, [textEffect, animationsEnabled]);
}
