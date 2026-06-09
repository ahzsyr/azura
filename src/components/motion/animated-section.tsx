"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useResolvedVisualExperience } from "@/components/theme/visual-experience-context";
import { cn } from "@/lib/utils";

type AnimatedSectionProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function AnimatedSection({ children, className, delay = 0 }: AnimatedSectionProps) {
  const osReduced = useReducedMotion();
  const resolved = useResolvedVisualExperience();
  const animationsOff = resolved?.animationsEnabled === false;

  if (animationsOff || osReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
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
  const animationsOff = resolved?.animationsEnabled === false;

  if (animationsOff || osReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      className={className}
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
  const animationsOff = resolved?.animationsEnabled === false;

  return (
    <motion.div
      whileHover={
        animationsOff || osReduced ? undefined : { y: -4, scale: 1.01 }
      }
      transition={{ duration: 0.2 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
