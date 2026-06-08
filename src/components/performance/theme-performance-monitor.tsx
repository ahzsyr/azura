"use client";

import { useEffect } from "react";
import {
  markThemeRenderEnd,
  markThemeRenderStart,
  startThemePerformanceMonitoring,
} from "@/lib/performance/theme-performance";

/** Client vitals + theme render timing (window.__AZ_THEME_PERF__). */
export function ThemePerformanceMonitor() {
  useEffect(() => {
    markThemeRenderStart();
    const stop = startThemePerformanceMonitoring();
    markThemeRenderEnd();

    if (process.env.NODE_ENV === "development") {
      const log = () => {
        const snap = window.__AZ_THEME_PERF__;
        if (snap) console.debug("[theme-perf]", snap);
      };
      const id = window.setInterval(log, 15000);
      return () => {
        window.clearInterval(id);
        stop();
      };
    }

    return stop;
  }, []);

  return null;
}
