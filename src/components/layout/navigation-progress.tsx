"use client";

import { usePathname } from "@/i18n/navigation";
import { findInternalNavAnchor, getInternalLinkPath } from "@/lib/navigation/internal-link";
import { recordNavigationStart } from "@/lib/performance/runtime-metrics";
import { useEffect, useRef, useState } from "react";

function setRouteNavigating(active: boolean) {
  document.documentElement.classList.toggle("route-navigating", active);
}

/**
 * Instant top-of-page progress indicator during client navigations.
 * Does not block interaction or hide the current screen.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const pathnameRef = useRef(pathname);
  const transitionIdRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const startNavigating = () => {
      setRouteNavigating(true);
      setVisible(true);
    };

    const onClick = (event: MouseEvent) => {
      const anchor = findInternalNavAnchor(event);
      if (!anchor) return;

      const nextPath = getInternalLinkPath(anchor);
      if (!nextPath) return;
      const current = pathnameRef.current;
      if (nextPath === current || nextPath === `${current}/`) return;

      transitionIdRef.current = recordNavigationStart(current, nextPath);
      startNavigating();
    };

    const onPopState = () => {
      transitionIdRef.current = recordNavigationStart(pathnameRef.current, window.location.pathname);
      startNavigating();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    setRouteNavigating(false);
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    return () => setRouteNavigating(false);
  }, []);

  return (
    <div
      className="nav-progress"
      role="progressbar"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}
