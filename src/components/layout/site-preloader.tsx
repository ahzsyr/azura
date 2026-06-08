"use client";

import { usePathname } from "@/i18n/navigation";
import { PreloaderView } from "@/features/preloader/preloader-view";
import {
  preloaderShowsOnInitialLoad,
  preloaderShowsOnNavigation,
} from "@/features/preloader/site-preloader.schema";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  settings: ResolvedSitePreloader;
};

function isInternalNavigationLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return href.startsWith("/");
  }
}

export function SitePreloader({ settings }: Props) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const showStartRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationPendingRef = useRef(false);
  const initialHandledRef = useRef(false);
  const reducedMotionRef = useRef(false);

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
    navigationPendingRef.current = false;
  }, [clearTimers, setShellPreloading]);

  const showPreloader = useCallback(() => {
    if (!settings.enabled) return;
    if (reducedMotionRef.current) return;
    showStartRef.current = performance.now();
    setVisible(true);
    setShellPreloading(true);

    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = setTimeout(() => {
      hidePreloader();
    }, settings.maxDurationMs);
  }, [hidePreloader, setShellPreloading, settings.enabled, settings.maxDurationMs]);

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
    if (!mounted || !settings.enabled) return;

    if (!initialHandledRef.current && preloaderShowsOnInitialLoad(settings.mode)) {
      initialHandledRef.current = true;
      showPreloader();

      const onReady = () => scheduleDismiss();
      if (document.readyState === "complete") {
        onReady();
      } else {
        window.addEventListener("load", onReady, { once: true });
        return () => window.removeEventListener("load", onReady);
      }
    }
  }, [mounted, scheduleDismiss, settings.enabled, settings.mode, showPreloader]);

  useEffect(() => {
    if (!mounted || !settings.enabled) return;
    if (!preloaderShowsOnNavigation(settings.mode)) return;

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigationLink(anchor)) return;

      const nextHref = anchor.getAttribute("href") ?? "";
      if (nextHref === pathname || nextHref === `${pathname}/`) return;

      navigationPendingRef.current = true;
      showPreloader();
    };

    const onPopState = () => {
      navigationPendingRef.current = true;
      showPreloader();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [mounted, pathname, settings.enabled, settings.mode, showPreloader]);

  useEffect(() => {
    if (!mounted || !settings.enabled) return;
    if (!navigationPendingRef.current) return;
    scheduleDismiss();
  }, [mounted, pathname, scheduleDismiss, settings.enabled]);

  useEffect(() => {
    return () => {
      clearTimers();
      document.documentElement.classList.remove("site-preloading");
    };
  }, [clearTimers]);

  if (!settings.enabled || !mounted) return null;

  return <PreloaderView settings={settings} hidden={!visible} />;
}
