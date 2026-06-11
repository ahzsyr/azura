"use client";

import type { ClientSearchAnalyticsPayload } from "@/features/search/analytics/search-analytics.types";

/** Track a catalog listing toolbar search (product/collection pages). */
export function trackListingSearchAnalytics(payload: {
  locale: string;
  q: string;
  resultCount: number;
}): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ type: "listing_query", ...payload });
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
