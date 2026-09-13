import type { TargetAndTransition, Transition } from "framer-motion";
import type { VisualLayerAnimation } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { PUBLIC_MOTION } from "@/lib/motion/public-motion";

const EASING: Record<VisualLayerAnimation["easing"], number[] | "linear"> = {
  easeOut: [...PUBLIC_MOTION.ease],
  easeInOut: [0.45, 0, 0.55, 1],
  linear: "linear",
};

type MotionValues = {
  opacity: number;
  x: number;
  y: number;
  scale: number;
};

function usesFade(type: VisualLayerAnimation["type"]) {
  return type === "fade" || type.startsWith("fade");
}

function usesScale(type: VisualLayerAnimation["type"]) {
  return type === "scale" || type === "fadeScale";
}

function buildInitial(animation: VisualLayerAnimation, baseOpacity: number, baseScale: number): MotionValues {
  const distance = animation.distance;
  const fromScale = animation.fromScale * baseScale;

  switch (animation.type) {
    case "none":
      return { opacity: baseOpacity, x: 0, y: 0, scale: baseScale };
    case "fade":
      return { opacity: 0, x: 0, y: 0, scale: baseScale };
    case "scale":
      return { opacity: baseOpacity, x: 0, y: 0, scale: fromScale };
    case "fadeScale":
      return { opacity: 0, x: 0, y: 0, scale: fromScale };
    case "slideUp":
      return { opacity: baseOpacity, x: 0, y: distance, scale: baseScale };
    case "slideDown":
      return { opacity: baseOpacity, x: 0, y: -distance, scale: baseScale };
    case "slideLeft":
      return { opacity: baseOpacity, x: distance, y: 0, scale: baseScale };
    case "slideRight":
      return { opacity: baseOpacity, x: -distance, y: 0, scale: baseScale };
    case "fadeSlideUp":
      return { opacity: 0, x: 0, y: distance, scale: baseScale };
    case "fadeSlideDown":
      return { opacity: 0, x: 0, y: -distance, scale: baseScale };
    case "fadeSlideLeft":
      return { opacity: 0, x: distance, y: 0, scale: baseScale };
    case "fadeSlideRight":
      return { opacity: 0, x: -distance, y: 0, scale: baseScale };
    default:
      return { opacity: usesFade(animation.type) ? 0 : baseOpacity, x: 0, y: 0, scale: usesScale(animation.type) ? fromScale : baseScale };
  }
}

export function buildVisualLayerMotion(
  animation: VisualLayerAnimation,
  options?: {
    reduceMotion?: boolean;
    baseOpacity?: number;
    baseScale?: number;
  },
): {
  initial: TargetAndTransition | false;
  animate: TargetAndTransition;
  transition: Transition;
} {
  const baseOpacity = options?.baseOpacity ?? 1;
  const baseScale = options?.baseScale ?? 1;
  const resting: MotionValues = { opacity: baseOpacity, x: 0, y: 0, scale: baseScale };

  if (options?.reduceMotion || animation.type === "none") {
    return {
      initial: false,
      animate: resting,
      transition: { duration: 0 },
    };
  }

  return {
    initial: buildInitial(animation, baseOpacity, baseScale),
    animate: resting,
    transition: {
      duration: Math.max(animation.durationMs, 0) / 1000,
      delay: Math.max(animation.delayMs, 0) / 1000,
      ease: EASING[animation.easing] as Transition["ease"],
    },
  };
}
