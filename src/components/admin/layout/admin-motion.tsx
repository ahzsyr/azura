"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
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

const pageTransition = {
  duration: ADMIN_MOTION.enterDuration,
  ease: ADMIN_MOTION.ease,
};

export const adminFadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: pageTransition },
};

type AdminPageTransitionProps = {
  children: React.ReactNode;
  className?: string;
  routeKey?: string;
};

export function AdminPageTransition({ children, className, routeKey }: AdminPageTransitionProps) {
  const reduced = useReducedMotion();
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    setAnimating(true);
  }, [routeKey]);

  if (reduced) {
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
          duration: ADMIN_MOTION.enterDuration,
          ease: ADMIN_MOTION.ease,
        }}
        onAnimationComplete={() => setAnimating(false)}
        className={cn(animating && "will-change-[opacity,transform]", className)}
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

export function AdminStaggerContainer({
  children,
  className,
  stagger = ADMIN_MOTION.stagger,
}: StaggerContainerProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
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
  const reduced = useReducedMotion();

  if (reduced) {
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
  const reduced = useReducedMotion();

  if (reduced) {
    return open ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: ADMIN_MOTION.enterDuration, ease: ADMIN_MOTION.ease }}
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
