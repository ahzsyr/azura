"use client";

import { ScrollRevealObserver } from "@/components/motion/scroll-reveal-observer";
import { useResolvedVisualExperience } from "@/components/theme/visual-experience-context";

/** Mounts scroll-reveal IO only when site/page animations are enabled. */
export function MotionRuntimeHost() {
  const resolved = useResolvedVisualExperience();
  if (resolved?.animationsEnabled === false) return null;
  return <ScrollRevealObserver />;
}
