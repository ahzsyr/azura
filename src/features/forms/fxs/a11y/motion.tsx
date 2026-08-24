/**
 * Motion / reduced-motion helpers for FXS.
 */
import type { ReactNode } from "react";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const FXS_MOTION_MS = 160;

export function fxsTransition(property = "all"): string {
  if (prefersReducedMotion()) return "none";
  return `${property} var(--fxs-motion, ${FXS_MOTION_MS}ms) ease`;
}

export function ProgressiveReveal({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <div
      className="fxs-reveal origin-top"
      style={{
        animation: prefersReducedMotion()
          ? undefined
          : "fxs-reveal-in var(--fxs-motion, 180ms) ease",
      }}
    >
      {children}
    </div>
  );
}
