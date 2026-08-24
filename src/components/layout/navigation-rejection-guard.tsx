"use client";

import { useEffect } from "react";
import { isSkippableNavigationError } from "@/lib/navigation/safe-app-router";

/**
 * Suppresses expected Next.js App Router navigation aborts from the console.
 * In-flight soft navigations reject with AbortError when superseded by a newer one.
 */
export function NavigationRejectionGuard() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isSkippableNavigationError(event.reason)) return;
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  return null;
}
