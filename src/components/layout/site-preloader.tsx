"use client";

import { PreloaderView } from "@/features/preloader/preloader-view";
import { preloaderShowsOnInitialLoad } from "@/features/preloader/site-preloader.schema";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";
import { SHELL_READY_EVENT } from "@/lib/motion/shell-ready";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  settings: ResolvedSitePreloader;
};

export function SitePreloader({ settings }: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const showStartRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
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
    if (!mounted || !settings.enabled) {
      if (mounted) {
        document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
      }
      return;
    }

    if (!initialHandledRef.current && preloaderShowsOnInitialLoad(settings.mode)) {
      initialHandledRef.current = true;

      if (reducedMotionRef.current) {
        document.documentElement.classList.remove("site-preloading");
        document.dispatchEvent(new CustomEvent(SHELL_READY_EVENT));
        return;
      }

      showPreloader();

      const onReady = () => scheduleDismiss();
      if (document.readyState === "complete" || document.readyState === "interactive") {
        onReady();
      } else {
        document.addEventListener("DOMContentLoaded", onReady, { once: true });
        return () => document.removeEventListener("DOMContentLoaded", onReady);
      }
    }
  }, [mounted, scheduleDismiss, settings.enabled, settings.mode, showPreloader]);

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
