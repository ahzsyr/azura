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
import { cardSessionDebugLog } from "@/lib/debug/agent-log";
import { runWithViewTransition } from "@/lib/theme/effects/transition-engine";
import { PUBLIC_MOTION } from "@/lib/motion/public-motion";
import {
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
};

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
 * content arrives, then crossfades via View Transitions API.
 */
export function MarketingPageTransition({ children }: Props) {
  const pathname = usePathname();
  const committedRef = useRef<ReactNode>(null);
  const committedPathRef = useRef(pathname);
  const hasCommittedRef = useRef(false);
  const prevPathnameRef = useRef(pathname);
  const [layerState, setLayerState] = useState<"idle" | "stale" | "entering">("idle");

  const skeletonActive = isRouteSkeleton(children);
  const realContent = isRealContent(children);
  const pending = skeletonActive || !realContent;
  const isNavigating =
    hasCommittedRef.current && committedPathRef.current !== pathname;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "auto" });
  }, [pathname]);

  useLayoutEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;

    if (!hasCommittedRef.current) return;
    setLayerState("stale");
  }, [pathname]);

  useLayoutEffect(() => {
    if (pending) return;

    if (committedRef.current === children && committedPathRef.current === pathname) {
      setLayerState("idle");
      return;
    }

    const commit = () => {
      const isFirstCommit = !hasCommittedRef.current;
      committedRef.current = children;
      committedPathRef.current = pathname;
      hasCommittedRef.current = true;
      if (isFirstCommit) {
        setLayerState("idle");
      } else {
        setLayerState("entering");
        window.setTimeout(() => {
          setLayerState("idle");
        }, PUBLIC_MOTION.routeEnterClearMs);
      }
      emitRouteContentReady();
      recordNavigationEnd(pathname, { success: true });
    };

    const shouldAnimate =
      hasCommittedRef.current &&
      typeof document !== "undefined" &&
      document.documentElement.dataset.pageTransitionEnabled !== "false";

    if (shouldAnimate) {
      // #region agent log
      cardSessionDebugLog(
        "marketing-page-transition.tsx:view-transition",
        "Route commit with view transition",
        { pathname, layerState, pending },
        "H5",
      );
      // #endregion
      runWithViewTransition(commit, { onFinished: clearSharedElementHandoff });
      return;
    }

    commit();
    clearSharedElementHandoff();
  }, [children, pending, pathname, layerState]);

  let renderContent: ReactNode;

  if (isNavigating) {
    renderContent = pending ? committedRef.current : children;
  } else if (!pending) {
    renderContent = children;
  } else if (hasCommittedRef.current && committedRef.current != null) {
    renderContent = committedRef.current;
  } else if (isShellPreloading()) {
    renderContent = null;
  } else {
    renderContent = firstLoadFallback(children);
  }

  const layerClass =
    layerState === "stale" || (isNavigating && pending)
      ? "route-page-layer route-page-layer--stale"
      : layerState === "entering"
        ? "route-page-layer route-page-layer--active"
        : "route-page-layer route-page-layer--idle";

  return (
    <div className="marketing-page-content">
      <div
        className={layerClass}
        aria-busy={pending && (isNavigating || !hasCommittedRef.current)}
        aria-label={pending && (isNavigating || !hasCommittedRef.current) ? "Loading page content" : undefined}
        data-route-content-ready={!pending ? "true" : undefined}
      >
        {renderContent}
      </div>
    </div>
  );
}
