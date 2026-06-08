"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useConstrainedMotion } from "@/hooks/use-constrained-motion";
import { cn } from "@/lib/utils";

type AnimatedSectionProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function AnimatedSection({ children, className, delay = 0 }: AnimatedSectionProps) {
  const osReduced = useReducedMotion();
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();

  if (shouldReduceMotion || osReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldSimplifyMotion ? 6 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: shouldSimplifyMotion ? 0.35 : 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
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
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();

  if (shouldReduceMotion || osReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldSimplifyMotion ? 0.3 : 0.5, delay }}
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
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();

  return (
    <motion.div
      whileHover={
        shouldReduceMotion || osReduced || shouldSimplifyMotion
          ? undefined
          : { y: -4, scale: 1.01 }
      }
      transition={{ duration: 0.2 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
