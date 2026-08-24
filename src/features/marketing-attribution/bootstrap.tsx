"use client";

import { useEffect } from "react";
import {
  captureAttributionToServer,
  getMarketingConsent,
  getOrCreateAttributionSnapshot,
  setMarketingConsent,
  trackMarketingEvent,
} from "./client";

/**
 * Bootstraps first-party marketing attribution on marketing pages.
 * Consent: defaults to GRANTED when no site-wide banner exists (audited: none found).
 * Set NEXT_PUBLIC_MARKETING_REQUIRE_CONSENT=1 to require explicit GRANTED before capture.
 */
export function MarketingAttributionBootstrap() {
  useEffect(() => {
    const requireConsent = process.env.NEXT_PUBLIC_MARKETING_REQUIRE_CONSENT === "1";
    let consent = getMarketingConsent();
    if (!requireConsent && consent === "UNKNOWN") {
      setMarketingConsent("GRANTED");
      consent = "GRANTED";
    }
    if (consent !== "GRANTED") return;

    const snapshot = getOrCreateAttributionSnapshot();
    void captureAttributionToServer(snapshot).then(() => {
      void trackMarketingEvent("PageView", {
        path: window.location.pathname,
        title: document.title,
      });
    });
  }, []);

  return null;
}
