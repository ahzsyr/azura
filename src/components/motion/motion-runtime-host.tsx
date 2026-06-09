"use client";

import { ScrollRevealObserver } from "@/components/motion/scroll-reveal-observer";
import { LazyBlockRevealObserver } from "@/components/motion/lazy-block-reveal-observer";
import { useResolvedVisualExperience } from "@/components/theme/visual-experience-context";

/** Lazy block fade-in always runs; scroll-reveal only when animations are enabled. */
export function MotionRuntimeHost() {
  const resolved = useResolvedVisualExperience();
  const animationsEnabled = resolved?.animationsEnabled !== false;

  return (
    <>
      <LazyBlockRevealObserver />
      {animationsEnabled ? <ScrollRevealObserver /> : null}
    </>
  );
}
