"use client";

import { usePathname } from "@/i18n/navigation";
import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";
import {
  firstRouteSkeleton,
  isBuildShell,
  isRouteSkeleton,
} from "@/lib/navigation/is-route-skeleton";
import { containsPartialRouteContent } from "@/lib/navigation/is-partial-route-content";
import { emitRouteContentReady } from "@/lib/motion/shell-ready";
import { recordNavigationEnd } from "@/lib/performance/runtime-metrics";
import { clearSharedElementHandoff } from "@/lib/navigation/shared-elements";
import { PUBLIC_MOTION } from "@/lib/motion/public-motion";
import { usePointerGestureActive } from "@/lib/hooks/use-pointer-gesture-active";
import {
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
};

const ROUTE_LAYER_KEY = "route-content";

function isRealContent(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;
  if (isRouteSkeleton(node)) return false;
  if (isBuildShell(node)) return false;
  if (containsPartialRouteContent(node)) return false;
  if (Array.isArray(node)) return node.some((child) => isRealContent(child));
  return isValidElement(node);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function firstLoadFallback(children: ReactNode): ReactNode {
  if (typeof document !== "undefined") {
    if (document.documentElement.classList.contains("site-preloading")) {
      return null;
    }
  }
  const skeleton = firstRouteSkeleton(children);
  if (skeleton) return skeleton;
  return <PageLoadingSkeleton variant="home" />;
}

function isShellPreloading(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("site-preloading");
}

/**
 * Stale-page hold during navigation — keeps outgoing page visible until real RSC
 * content arrives, then crossfades via CSS (not document.startViewTransition).
 */
export function MarketingPageTransition({ children }: Props) {
  const pathname = usePathname();
  const committedPathRef = useRef(pathname);
  const hasCommittedRef = useRef(false);
  const prevPathnameRef = useRef(pathname);
  const enterTimeoutRef = useRef<number | null>(null);
  const [layerState, setLayerState] = useState<"idle" | "stale" | "entering">("idle");
  const [holdFrozen, setHoldFrozen] = useState(false);
  const [displayChildren, setDisplayChildren] = useState<ReactNode>(children);
  const { runWhenGestureIdle } = usePointerGestureActive();

  const skeletonActive = isRouteSkeleton(children);
  const realContent = isRealContent(children);
  const pending = skeletonActive || !realContent;
  const isNavigating =
    hasCommittedRef.current && committedPathRef.current !== pathname;
  const showStaleHold = holdFrozen && isNavigating;

  const clearEnterTimeout = () => {
    if (enterTimeoutRef.current == null) return;
    window.clearTimeout(enterTimeoutRef.current);
    enterTimeoutRef.current = null;
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "auto" });
  }, [pathname]);

  useLayoutEffect(() => {
    if (prevPathnameRef.current === pathname) return;

    prevPathnameRef.current = pathname;
    clearEnterTimeout();

    if (!hasCommittedRef.current) return;
    setHoldFrozen(true);
    setLayerState("stale");
  }, [pathname, pending]);

  useLayoutEffect(() => {
    if (holdFrozen) return;
    setDisplayChildren(children);
  }, [children, holdFrozen]);

  useLayoutEffect(() => {
    if (pending) return;

    if (committedPathRef.current === pathname && !holdFrozen) {
      setLayerState("idle");
      return;
    }

    const commit = () => {
      const isFirstCommit = !hasCommittedRef.current;

      committedPathRef.current = pathname;
      hasCommittedRef.current = true;
      setHoldFrozen(false);
      setDisplayChildren(children);

      if (isFirstCommit) {
        setLayerState("idle");
      } else {
        setLayerState("entering");
        clearEnterTimeout();
        enterTimeoutRef.current = window.setTimeout(() => {
          enterTimeoutRef.current = null;
          setLayerState("idle");
        }, PUBLIC_MOTION.routeEnterClearMs);
      }
      emitRouteContentReady();
      recordNavigationEnd(pathname, { success: true });
    };

    // Route commits must stay outside document.startViewTransition — wrapping React
    // DOM updates there races with reconciliation and causes insertBefore NotFoundError.
    runWhenGestureIdle(() => {
      commit();
      clearSharedElementHandoff();
    });
  }, [children, holdFrozen, pending, pathname, runWhenGestureIdle]);

  useEffect(() => () => clearEnterTimeout(), []);

  let visibleContent: ReactNode;

  if (showStaleHold) {
    visibleContent = displayChildren;
  } else if (!pending) {
    visibleContent = children;
  } else if (hasCommittedRef.current) {
    visibleContent = displayChildren;
  } else if (isShellPreloading()) {
    visibleContent = children;
  } else {
    visibleContent = firstLoadFallback(children);
  }

  const layerClass = showStaleHold
    ? "route-page-layer route-page-layer--stale"
    : layerState === "entering"
      ? "route-page-layer route-page-layer--active"
      : "route-page-layer route-page-layer--idle";

  return (
    <div className="marketing-page-content">
      <div
        key={ROUTE_LAYER_KEY}
        className={layerClass}
        aria-busy={showStaleHold || (pending && !hasCommittedRef.current) ? true : undefined}
        aria-label={
          showStaleHold || (pending && !hasCommittedRef.current)
            ? "Loading page content"
            : undefined
        }
        data-route-content-ready={!pending && !showStaleHold ? "true" : undefined}
      >
        {visibleContent}
      </div>
    </div>
  );
}
