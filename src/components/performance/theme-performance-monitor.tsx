"use client";

import { useEffect } from "react";
import { DevPerformancePanel } from "@/components/performance/dev-performance-panel";
import {
  markThemeRenderEnd,
  markThemeRenderStart,
  startThemePerformanceMonitoring,
} from "@/lib/performance/theme-performance";

/** Client vitals + route metrics (window.__AZ_RUNTIME_METRICS__). */
export function ThemePerformanceMonitor() {
  useEffect(() => {
    markThemeRenderStart();
    const stop = startThemePerformanceMonitoring();
    markThemeRenderEnd();

    if (process.env.NODE_ENV === "development") {
      const log = () => {
        const snap = window.__AZ_RUNTIME_METRICS__;
        if (snap) console.debug("[runtime-perf]", snap);
      };
      const id = window.setInterval(log, 30000);
      return () => {
        window.clearInterval(id);
        stop();
      };
    }

    return stop;
  }, []);

  if (process.env.NODE_ENV === "development") {
    return <DevPerformancePanel />;
  }

  return null;
}
