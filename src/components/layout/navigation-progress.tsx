"use client";

import { usePathname } from "@/i18n/navigation";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { findInternalNavAnchor, getInternalLinkPath } from "@/lib/navigation/internal-link";
import { ROUTE_CONTENT_READY_EVENT } from "@/lib/motion/shell-ready";
import { NAVIGATION_ABORTED_EVENT } from "@/lib/navigation/safe-app-router";
import { recordNavigationStart } from "@/lib/performance/runtime-metrics";
import { useEffect, useRef, useState } from "react";

function normalizeNavPath(pathPart: string): string {
  let neutralPath = stripAnyLocalePrefix(pathPart);
  const pagesMatch = neutralPath.match(/^\/pages\/([^/]+)\/?$/);
  if (pagesMatch?.[1]) {
    neutralPath = getCmsPagePublicPath(pagesMatch[1]);
  }
  return neutralPath;
}

function setRouteNavigating(active: boolean) {
  document.documentElement.classList.toggle("route-navigating", active);
}

function clearNavProgress(setVisible: (value: boolean) => void) {
  setRouteNavigating(false);
  setVisible(false);
}

const NAV_STUCK_TIMEOUT_MS = 8000;

/**
 * Top-of-page progress indicator during client navigations.
 * Clears when route content is committed, not only when the URL changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const pathnameRef = useRef(pathname);
  const transitionIdRef = useRef<string | null>(null);
  const waitingForContentRef = useRef(false);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStuckTimer = () => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  };

  const finishNavigating = (setVisible: (value: boolean) => void, _reason: string) => {
    clearStuckTimer();
    waitingForContentRef.current = false;
    clearNavProgress(setVisible);
  };

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const startNavigating = () => {
      waitingForContentRef.current = true;
      setRouteNavigating(true);
      setVisible(true);
      clearStuckTimer();
      stuckTimerRef.current = setTimeout(() => {
        if (!waitingForContentRef.current) return;
        finishNavigating(setVisible, "timeout");
      }, NAV_STUCK_TIMEOUT_MS);
    };

    const onClick = (event: MouseEvent) => {
      const anchor = findInternalNavAnchor(event);
      if (!anchor) return;

      const nextPath = getInternalLinkPath(anchor);
      if (!nextPath) return;
      const neutralPath = normalizeNavPath(nextPath);
      const current = pathnameRef.current;
      if (neutralPath === current || neutralPath === `${current}/`) return;

      transitionIdRef.current = recordNavigationStart(current, neutralPath);
      startNavigating();
    };

    const onPopState = () => {
      transitionIdRef.current = recordNavigationStart(pathnameRef.current, window.location.pathname);
      startNavigating();
    };

    const onContentReady = () => {
      if (!waitingForContentRef.current) return;
      finishNavigating(setVisible, "content-ready");
    };

    const onNavAborted = () => {
      if (!waitingForContentRef.current) return;
      finishNavigating(setVisible, "nav-aborted");
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    document.addEventListener(ROUTE_CONTENT_READY_EVENT, onContentReady);
    window.addEventListener(NAVIGATION_ABORTED_EVENT, onNavAborted);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener(ROUTE_CONTENT_READY_EVENT, onContentReady);
      window.removeEventListener(NAVIGATION_ABORTED_EVENT, onNavAborted);
      clearStuckTimer();
    };
  }, []);

  useEffect(() => {
    if (!waitingForContentRef.current) {
      clearNavProgress(setVisible);
    }
  }, [pathname]);

  useEffect(() => {
    return () => clearNavProgress(setVisible);
  }, []);

  return (
    <div
      className="nav-progress"
      role="progressbar"
      aria-label="Loading page"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}
