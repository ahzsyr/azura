"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { useResolvedVisualExperience } from "@/components/theme/visual-experience-context";
import { useConstrainedMotion } from "@/hooks/use-constrained-motion";
import { PUBLIC_MOTION, PUBLIC_MOTION_MOBILE } from "@/lib/motion/public-motion";
import { cn } from "@/lib/utils";

type AnimatedSectionProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function AnimatedSection({ children, className, delay = 0 }: AnimatedSectionProps) {
  const osReduced = useReducedMotion();
  const resolved = useResolvedVisualExperience();
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const [animating, setAnimating] = useState(true);
  const animationsOff = resolved?.animationsEnabled === false;

  const duration = shouldSimplifyMotion
    ? PUBLIC_MOTION_MOBILE.revealDuration
    : PUBLIC_MOTION.revealDuration;

  if (animationsOff || osReduced || shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, delay, ease: PUBLIC_MOTION.ease }}
      onAnimationComplete={() => setAnimating(false)}
      className={cn(
        animating && !shouldSimplifyMotion && "will-change-[opacity,transform]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const osReduced = useReducedMotion();
  const resolved = useResolvedVisualExperience();
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const [animating, setAnimating] = useState(true);
  const animationsOff = resolved?.animationsEnabled === false;

  const duration = shouldSimplifyMotion
    ? PUBLIC_MOTION_MOBILE.enterDuration
    : PUBLIC_MOTION.enterDuration;

  if (animationsOff || osReduced || shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: PUBLIC_MOTION.ease }}
      onAnimationComplete={() => setAnimating(false)}
      className={cn(
        animating && !shouldSimplifyMotion && "will-change-[opacity,transform]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function HoverCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const osReduced = useReducedMotion();
  const resolved = useResolvedVisualExperience();
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const animationsOff = resolved?.animationsEnabled === false;
  const disabled = animationsOff || osReduced || shouldReduceMotion;

  return (
    <motion.div
      whileHover={disabled ? undefined : { y: -4, scale: 1.01 }}
      transition={{
        duration: shouldSimplifyMotion
          ? PUBLIC_MOTION_MOBILE.enterDuration
          : PUBLIC_MOTION.enterDuration,
        ease: PUBLIC_MOTION.ease,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
