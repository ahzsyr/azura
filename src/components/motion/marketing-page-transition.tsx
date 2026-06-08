"use client";

import { usePathname } from "@/i18n/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const },
};

/**
 * Smooth page entrance on route changes. Scrolls to top on internal navigation
 * (unless a hash target is present). Respects reduced-motion preferences.
 */
export function MarketingPageTransition({ children }: Props) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "instant" });
  }, [pathname, reducedMotion]);

  if (reducedMotion) {
    return <div key={pathname}>{children}</div>;
  }

  return (
    <motion.div key={pathname} {...pageTransition}>
      {children}
    </motion.div>
  );
}
