"use client";

import { PreloaderView } from "@/features/preloader/preloader-view";
import {
  preloaderShowsOnInitialLoad,
  preloaderShowsOnNavigation,
} from "@/features/preloader/site-preloader.schema";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { usePathname } from "@/i18n/navigation";
import {
  isRouteContentReady,
  ROUTE_CONTENT_READY_EVENT,
  SHELL_READY_EVENT,
} from "@/lib/motion/shell-ready";
import { flashDebugLog } from "@/lib/debug/flash-debug-log";
import { removeBootPreloader } from "@/lib/preloader/boot-preloader";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  settings: ResolvedSitePreloader;
};

export function SitePreloader({ settings }: Props) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const showStartRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialHandledRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);
  const navPreloaderActiveRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const setShellPreloading = useCallback((active: boolean) => {
    document.documentElement.classList.toggle("site-preloading", active);
  }, []);

  const hidePreloader = useCallback(() => {
    // #region agent log
    flashDebugLog({
      location: "site-preloader.tsx:hidePreloader",
      message: "Hiding preloader",
      hypothesisId: "H3",
      runId: "post-fix",
      data: { perfNow: performance.now(), contentReady: isRouteContentReady() },
    });
    // #endregion
    clearTimers();
    setVisible(false);
    setShellPreloading(false);
    removeBootPreloader();
    navPreloaderActiveRef.current = false;
    document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
  }, [clearTimers, setShellPreloading]);

  const showPreloader = useCallback(
    (forNavigation = false) => {
      if (!settings.enabled) return;
      if (reducedMotionRef.current) return;
      // #region agent log
      flashDebugLog({
        location: "site-preloader.tsx:showPreloader",
        message: "Showing preloader",
        hypothesisId: "H3",
        runId: "post-fix",
        data: {
          forNavigation,
          perfNow: performance.now(),
          contentReady: isRouteContentReady(),
        },
      });
      // #endregion
      navPreloaderActiveRef.current = forNavigation;
      showStartRef.current = performance.now();
      setVisible(true);
      setShellPreloading(true);

      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
      maxTimerRef.current = setTimeout(() => {
        hidePreloader();
      }, settings.maxDurationMs);
    },
    [hidePreloader, setShellPreloading, settings.enabled, settings.maxDurationMs],
  );

  const scheduleDismiss = useCallback(() => {
    clearTimers();
    const elapsed = performance.now() - showStartRef.current;
    const remaining = Math.max(0, settings.minDurationMs - elapsed);

    dismissTimerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        hidePreloader();
      });
    }, remaining);
  }, [clearTimers, hidePreloader, settings.minDurationMs]);

  useEffect(() => {
    // #region agent log
    flashDebugLog({
      location: "site-preloader.tsx:mount",
      message: "SitePreloader mounted",
      hypothesisId: "H3",
      runId: "post-fix",
      data: {
        perfNow: performance.now(),
        contentReady: isRouteContentReady(),
        sitePreloading: document.documentElement.classList.contains("site-preloading"),
      },
    });
    // #endregion
    setMounted(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedMotionRef.current = reduced;
    if (reduced) {
      document.documentElement.classList.remove("site-preloading");
      removeBootPreloader();
      document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
    }
  }, []);

  useEffect(() => {
    if (!mounted || !settings.enabled) {
      if (mounted) {
        document.documentElement.classList.remove("site-preloading");
        removeBootPreloader();
        document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
      }
      return;
    }

    if (initialHandledRef.current) return;

    if (preloaderShowsOnInitialLoad(settings.mode)) {
      initialHandledRef.current = true;

      if (reducedMotionRef.current) {
        document.documentElement.classList.remove("site-preloading");
        removeBootPreloader();
        document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
        return;
      }

      if (isRouteContentReady()) {
        // #region agent log
        flashDebugLog({
          location: "site-preloader.tsx:initialSkip",
          message: "Skipping preloader — content already ready on mount",
          hypothesisId: "H2",
          runId: "post-fix",
          data: { perfNow: performance.now() },
        });
        // #endregion
        document.documentElement.classList.remove("site-preloading");
        removeBootPreloader();
        document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
        return;
      }

      showPreloader(false);

      const onContentReady = () => scheduleDismiss();
      document.addEventListener(ROUTE_CONTENT_READY_EVENT, onContentReady, { once: true });

      const observer = new MutationObserver(() => {
        if (isRouteContentReady()) {
          observer.disconnect();
          scheduleDismiss();
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-route-content-ready", "class"],
        subtree: true,
      });

      return () => {
        document.removeEventListener(ROUTE_CONTENT_READY_EVENT, onContentReady);
        observer.disconnect();
      };
    }

    initialHandledRef.current = true;
    document.documentElement.classList.remove("site-preloading");
    removeBootPreloader();
    document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
  }, [mounted, scheduleDismiss, settings.enabled, settings.mode, showPreloader, hidePreloader]);

  useEffect(() => {
    if (!mounted || !settings.enabled || !preloaderShowsOnNavigation(settings.mode)) return;
    if (!initialHandledRef.current) return;

    let wasNavigating = document.documentElement.classList.contains("route-navigating");

    const onClassChange = () => {
      const navigating = document.documentElement.classList.contains("route-navigating");
      if (navigating && !wasNavigating) {
        showPreloader(true);
      }
      wasNavigating = navigating;
    };

    const obs = new MutationObserver(onClassChange);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [mounted, settings.enabled, settings.mode, showPreloader]);

  useEffect(() => {
    if (!mounted || !settings.enabled || !preloaderShowsOnNavigation(settings.mode)) return;

    if (prevPathnameRef.current === null) {
      prevPathnameRef.current = pathname;
      return;
    }

    if (prevPathnameRef.current === pathname) return;

    prevPathnameRef.current = pathname;

    if (!navPreloaderActiveRef.current || !visible) return;

    const onContentReady = () => scheduleDismiss();
    document.addEventListener(ROUTE_CONTENT_READY_EVENT, onContentReady, { once: true });

    return () => {
      document.removeEventListener(ROUTE_CONTENT_READY_EVENT, onContentReady);
    };
  }, [mounted, pathname, scheduleDismiss, settings.enabled, settings.mode, visible]);

  useEffect(() => {
    return () => {
      clearTimers();
      document.documentElement.classList.remove("site-preloading");
      removeBootPreloader();
      document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
    };
  }, [clearTimers]);

  if (!settings.enabled || !mounted) return null;

  return createPortal(
    <PreloaderView settings={settings} hidden={!visible} />,
    document.body,
  );
}
