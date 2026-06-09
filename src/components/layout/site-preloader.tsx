"use client";

import { PreloaderView } from "@/features/preloader/preloader-view";
import {
  preloaderShowsOnInitialLoad,
  preloaderShowsOnNavigation,
} from "@/features/preloader/site-preloader.schema";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { usePathname } from "@/i18n/navigation";
import { SHELL_READY_EVENT } from "@/lib/motion/shell-ready";
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
    clearTimers();
    setVisible(false);
    setShellPreloading(false);
    navPreloaderActiveRef.current = false;
    document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
  }, [clearTimers, setShellPreloading]);

  const showPreloader = useCallback(
    (forNavigation = false) => {
      if (!settings.enabled) return;
      if (reducedMotionRef.current) return;
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
    setMounted(true);
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!mounted || !settings.enabled) {
      if (mounted) {
        document.documentElement.classList.remove("site-preloading");
        document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
      }
      return;
    }

    if (initialHandledRef.current) return;

    if (preloaderShowsOnInitialLoad(settings.mode)) {
      initialHandledRef.current = true;

      if (reducedMotionRef.current) {
        document.documentElement.classList.remove("site-preloading");
        document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
        return;
      }

      showPreloader(false);

      const onReady = () => scheduleDismiss();
      if (document.readyState === "complete" || document.readyState === "interactive") {
        onReady();
      } else {
        document.addEventListener("DOMContentLoaded", onReady, { once: true });
        return () => document.removeEventListener("DOMContentLoaded", onReady);
      }
      return;
    }

    initialHandledRef.current = true;
    document.documentElement.classList.remove("site-preloading");
    document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
  }, [mounted, scheduleDismiss, settings.enabled, settings.mode, showPreloader]);

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
    if (navPreloaderActiveRef.current && visible) {
      scheduleDismiss();
    }
  }, [mounted, pathname, scheduleDismiss, settings.enabled, settings.mode, visible]);

  useEffect(() => {
    return () => {
      clearTimers();
      document.documentElement.classList.remove("site-preloading");
      document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
    };
  }, [clearTimers]);

  if (!settings.enabled || !mounted) return null;

  return createPortal(
    <PreloaderView settings={settings} hidden={!visible} />,
    document.body,
  );
}
