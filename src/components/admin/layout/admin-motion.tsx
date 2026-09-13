"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  useConstrainedMotion,
  ADMIN_MOTION_MOBILE,
} from "@/hooks/use-constrained-motion";
import { cn } from "@/lib/utils";

export const ADMIN_MOTION = {
  ease: [0.22, 1, 0.36, 1] as const,
  enterDuration: 0.22,
  exitDuration: 0.16,
  stagger: 0.02,
} as const;

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

type AdminPageTransitionProps = {
  children: React.ReactNode;
  className?: string;
  routeKey?: string;
};

export function AdminPageTransition({ children, className, routeKey }: AdminPageTransitionProps) {
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const [animating, setAnimating] = useState(true);
  const enterDuration = shouldSimplifyMotion
    ? ADMIN_MOTION_MOBILE.enterDuration
    : ADMIN_MOTION.enterDuration;

  useEffect(() => {
    setAnimating(true);
  }, [routeKey]);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transition={{
          duration: enterDuration,
          ease: ADMIN_MOTION.ease,
        }}
        onAnimationComplete={() => setAnimating(false)}
        className={cn(
          animating && !shouldSimplifyMotion && "will-change-[opacity,transform]",
          className,
        )}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

type StaggerContainerProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
};

export const adminFadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ADMIN_MOTION.enterDuration, ease: ADMIN_MOTION.ease },
  },
};

export function AdminStaggerContainer({
  children,
  className,
  stagger = ADMIN_MOTION.stagger,
}: StaggerContainerProps) {
  const { shouldReduceMotion, allowStagger, shouldSimplifyMotion } = useConstrainedMotion();

  if (shouldReduceMotion || !allowStagger) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: shouldSimplifyMotion ? 0 : stagger,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AdminStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { shouldReduceMotion, allowStagger } = useConstrainedMotion();

  if (shouldReduceMotion || !allowStagger) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={adminFadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function AdminAccordionContent({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const duration = shouldSimplifyMotion
    ? ADMIN_MOTION_MOBILE.enterDuration
    : ADMIN_MOTION.enterDuration;

  if (shouldReduceMotion) {
    return open ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration, ease: ADMIN_MOTION.ease }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AdminSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}
