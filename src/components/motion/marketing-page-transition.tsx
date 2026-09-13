"use client";

import { usePathname } from "@/i18n/navigation";
import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";
import {
  firstRouteSkeleton,
  isBuildShell,
  isRouteSkeleton,
} from "@/lib/navigation/is-route-skeleton";
import { containsPartialRouteContent } from "@/lib/navigation/is-partial-route-content";
import { emitRouteContentReady, SHELL_READY_EVENT } from "@/lib/motion/shell-ready";
import { recordNavigationEnd } from "@/lib/performance/runtime-metrics";
import { clearSharedElementHandoff } from "@/lib/navigation/shared-elements";
import { readPageTransitionEnterClearMs } from "@/lib/navigation/page-transitions";
import { usePointerGestureActive } from "@/lib/hooks/use-pointer-gesture-active";
import { removeBootPreloader } from "@/lib/preloader/boot-preloader";
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

/** Escape hatch: dismiss overlay if route stays pending — never hide main content. */
const PENDING_PRELOADER_ESCAPE_MS = 4000;

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

/**
 * Route-owned pending UI — never gated on preloader state.
 * Build shell and missing skeletons always resolve to a visible PageLoadingSkeleton.
 */
function pendingFallback(children: ReactNode): ReactNode {
  const skeleton = firstRouteSkeleton(children);
  if (skeleton) return skeleton;
  return <PageLoadingSkeleton variant="home" />;
}

function dismissPreloaderOverlay(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("site-preloading");
  removeBootPreloader();
  document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
}

/**
 * Stale-page hold during navigation — keeps outgoing page visible until real RSC
 * content arrives, then crossfades via CSS (not document.startViewTransition).
 *
 * Route state owns content vs skeleton. Preloader is overlay-only and must never
 * hide or null out the main route layer.
 */
export function MarketingPageTransition({ children }: Props) {
  const pathname = usePathname();
  const committedPathRef = useRef(pathname);
  const hasCommittedRef = useRef(false);
  const prevPathnameRef = useRef(pathname);
  const enterTimeoutRef = useRef<number | null>(null);
  const pendingEscapeRef = useRef<number | null>(null);
  const [layerState, setLayerState] = useState<"idle" | "stale" | "entering">("idle");
  const [holdFrozen, setHoldFrozen] = useState(false);
  const [displayChildren, setDisplayChildren] = useState<ReactNode>(children);
  const { runWhenGestureIdle } = usePointerGestureActive();

  const skeletonActive = isRouteSkeleton(children);
  const buildShellActive = isBuildShell(children);
  const realContent = isRealContent(children);
  /** Build shell is loading/fallback — never "ready" content. */
  const pending = skeletonActive || buildShellActive || !realContent;
  const isNavigating =
    hasCommittedRef.current && committedPathRef.current !== pathname;
  const showStaleHold = holdFrozen && isNavigating;

  const clearEnterTimeout = () => {
    if (enterTimeoutRef.current == null) return;
    window.clearTimeout(enterTimeoutRef.current);
    enterTimeoutRef.current = null;
  };

  const clearPendingEscape = () => {
    if (pendingEscapeRef.current == null) return;
    window.clearTimeout(pendingEscapeRef.current);
    pendingEscapeRef.current = null;
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
        clearEnterTimeout();
        const enterClearMs = readPageTransitionEnterClearMs();
        if (enterClearMs <= 0) {
          setLayerState("idle");
        } else {
          setLayerState("entering");
          enterTimeoutRef.current = window.setTimeout(() => {
            enterTimeoutRef.current = null;
            setLayerState("idle");
          }, enterClearMs);
        }
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

  /** Pending escape hatch: dismiss preloader overlay; keep skeleton visible. */
  useEffect(() => {
    if (!pending || hasCommittedRef.current) {
      clearPendingEscape();
      return;
    }

    pendingEscapeRef.current = window.setTimeout(() => {
      pendingEscapeRef.current = null;
      dismissPreloaderOverlay();
    }, PENDING_PRELOADER_ESCAPE_MS);

    return () => clearPendingEscape();
  }, [pending, pathname]);

  useEffect(() => () => {
    clearEnterTimeout();
    clearPendingEscape();
  }, []);

  let visibleContent: ReactNode;

  if (showStaleHold) {
    visibleContent = displayChildren;
  } else if (!pending) {
    visibleContent = children;
  } else if (hasCommittedRef.current) {
    // Navigating with pending new content — hold previous page, not blank.
    visibleContent = displayChildren;
  } else {
    // First load pending: always show visible skeleton (never null / never hide).
    visibleContent = pendingFallback(children);
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
