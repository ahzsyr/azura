"use client";

import type { ClientSearchAnalyticsPayload } from "@/features/search/analytics/search-analytics.types";

export function trackSearchAnalytics(payload: ClientSearchAnalyticsPayload): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/search/analytics",
        new Blob([body], { type: "application/json" })
      );
      return;
    }
    void fetch("/api/search/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* non-blocking */
  }
}
