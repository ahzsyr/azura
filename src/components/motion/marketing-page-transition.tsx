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
  pauseLiquidGlassForTransition,
  resumeLiquidGlassAfterTransition,
} from "@/features/theme/liquid-glass-controller";
import { useRouter } from "@/i18n/navigation";
import {
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

/** Escape hatch: dismiss overlay + force-commit if route stays pending. */
const PENDING_PRELOADER_ESCAPE_MS = 4000;

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
 * First load must paint `children` unless the route root is an explicit skeleton /
 * build shell. Deep "partial" / "real content" heuristics must never replace SSR
 * HTML with PageLoadingSkeleton (React #418 HTML + stuck home skeleton).
 */
export function MarketingPageTransition({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const committedPathRef = useRef(pathname);
  const hasCommittedRef = useRef(false);
  const prevPathnameRef = useRef(pathname);
  const enterTimeoutRef = useRef<number | null>(null);
  const pendingEscapeRef = useRef<number | null>(null);
  const [layerState, setLayerState] = useState<"idle" | "stale" | "entering">("idle");
  const [holdFrozen, setHoldFrozen] = useState(false);
  const [displayChildren, setDisplayChildren] = useState<ReactNode>(children);
  const [forceCommitted, setForceCommitted] = useState(false);
  const { runWhenGestureIdle } = usePointerGestureActive();

  /** Explicit route loading only — never deep-walk CMS trees for "partial" text. */
  const skeletonActive = isRouteSkeleton(children);
  const buildShellActive = isBuildShell(children);
  const routePending = skeletonActive || buildShellActive;
  /** After escape hatch, never treat the route as first-load pending again. */
  const pending = forceCommitted ? false : routePending;
  const isNavigating =
    hasCommittedRef.current && committedPathRef.current !== pathname;
  /**
   * During client navigations, hold stale page while the new tree still has a
   * marked Suspense fallback (attr-only — see containsPartialRouteContent).
   */
  const navStillStreaming =
    isNavigating && !routePending && containsPartialRouteContent(children);
  const showStaleHold = holdFrozen && (isNavigating || navStillStreaming) && !forceCommitted;

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
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  useLayoutEffect(() => {
    if (prevPathnameRef.current === pathname) return;

    prevPathnameRef.current = pathname;
    clearEnterTimeout();
    setForceCommitted(false);

    if (!hasCommittedRef.current) return;
    setHoldFrozen(true);
    setLayerState("stale");
  }, [pathname]);

  useLayoutEffect(() => {
    if (holdFrozen) return;
    setDisplayChildren(children);
  }, [children, holdFrozen]);

  useLayoutEffect(() => {
    if (pending || navStillStreaming) return;

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
  }, [children, holdFrozen, pending, navStillStreaming, pathname, runWhenGestureIdle]);

  /** Pending escape: dismiss preloader and force-commit children (never leave skeleton forever). */
  useEffect(() => {
    if ((!pending && !navStillStreaming) || hasCommittedRef.current) {
      clearPendingEscape();
      return;
    }

    pendingEscapeRef.current = window.setTimeout(() => {
      pendingEscapeRef.current = null;
      dismissPreloaderOverlay();
      hasCommittedRef.current = true;
      committedPathRef.current = pathname;
      setForceCommitted(true);
      setHoldFrozen(false);
      setDisplayChildren(children);
      setLayerState("idle");
      emitRouteContentReady();
      recordNavigationEnd(pathname, { success: true });
      // Compile-time build shell never self-resolves — ask Next for real RSC.
      if (isBuildShell(children)) {
        try {
          router.refresh();
        } catch {
          /* ignore */
        }
      }
    }, PENDING_PRELOADER_ESCAPE_MS);

    return () => clearPendingEscape();
  }, [pending, navStillStreaming, pathname, children, router]);

  useEffect(
    () => () => {
      clearEnterTimeout();
      clearPendingEscape();
    },
    [],
  );

  // Cheap blur + pause specular rAF while stale/enter layers are compositing.
  const glassTransitionActive =
    showStaleHold || layerState === "stale" || layerState === "entering";
  useEffect(() => {
    if (glassTransitionActive) {
      pauseLiquidGlassForTransition();
      return () => resumeLiquidGlassAfterTransition();
    }
    return undefined;
  }, [glassTransitionActive]);

  // Initial preloader: pause until site-preloading class clears.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    let held = false;
    const sync = () => {
      const preloading = root.classList.contains("site-preloading");
      if (preloading && !held) {
        pauseLiquidGlassForTransition();
        held = true;
      } else if (!preloading && held) {
        resumeLiquidGlassAfterTransition();
        held = false;
      }
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mo.disconnect();
      if (held) resumeLiquidGlassAfterTransition();
    };
  }, []);

  let visibleContent: ReactNode;

  if (showStaleHold) {
    visibleContent = displayChildren;
  } else if (!pending) {
    // First load + ready routes: always paint RSC children (matches SSR HTML).
    visibleContent = children;
  } else if (hasCommittedRef.current) {
    // Navigating with pending new content — hold previous page, not blank.
    visibleContent = displayChildren;
  } else {
    // First load with explicit route skeleton / build shell only.
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
