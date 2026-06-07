"use client";

import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Wraps marketing page content with a fade-in entrance animation.
 * Page-to-page transitions use the View Transitions API (configured in globals.css
 * via astroZoomIn/astroZoomOut keyframes). This component handles the initial
 * paint entrance for layout-level children.
 */
export function MarketingPageTransition({ children }: Props) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <div className="animate-fade-in" style={{ animationDuration: "0.4s" }}>
      {children}
    </div>
  );
}
