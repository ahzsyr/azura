"use client";

import { usePathname } from "@/i18n/navigation";
import { firstRouteSkeleton, isRouteSkeleton } from "@/lib/navigation/is-route-skeleton";
import {
  markNavigationSkeletonActive,
  recordNavigationEnd,
} from "@/lib/performance/runtime-metrics";
import { isValidElement, useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const OVERLAY_DELAY_MS = 90;

function hasRenderableContent(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;
  if (isRouteSkeleton(node)) return true;
  if (Array.isArray(node)) return node.some((child) => hasRenderableContent(child));
  return isValidElement(node);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Progressive route loading without framer-motion on the critical path.
 */
export function MarketingPageTransition({ children }: Props) {
  const pathname = usePathname();
  const committedChildrenRef = useRef(children);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [overlaySkeleton, setOverlaySkeleton] = useState<ReactNode | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const skeletonActive = isRouteSkeleton(children);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "instant" });
  }, [pathname]);

  useEffect(() => {
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }

    if (skeletonActive) {
      markNavigationSkeletonActive();
      const skeleton = firstRouteSkeleton(children);
      overlayTimerRef.current = setTimeout(() => {
        setOverlaySkeleton(skeleton);
      }, OVERLAY_DELAY_MS);
      return;
    }

    if (!hasRenderableContent(children)) {
      return;
    }

    setOverlaySkeleton(null);
    committedChildrenRef.current = children;
    setDisplayChildren(children);
    recordNavigationEnd(pathname, { success: true });
  }, [children, skeletonActive, pathname]);

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, []);

  return (
    <div className="marketing-page-content">
      <div
        className={
          overlaySkeleton
            ? "route-page-layer route-page-layer--stale"
            : "route-page-layer route-page-layer--active"
        }
        aria-busy={Boolean(overlaySkeleton)}
      >
        {displayChildren}
      </div>
      {overlaySkeleton ? (
        <div className="route-loading-overlay route-loading-overlay--minimal" aria-hidden="true" />
      ) : null}
    </div>
  );
}
