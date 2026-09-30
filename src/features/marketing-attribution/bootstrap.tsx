"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  captureAttributionToServer,
  consumePendingCampaignEntry,
  getMarketingConsent,
  getOrCreateAttributionSnapshot,
  getStoredAttribution,
  isGenuineNewCampaignEntry,
  setMarketingConsent,
  trackMarketingEvent,
  urlHasCampaignEntry,
  type AttributionSnapshot,
} from "./client";

const ATTR_KEY = "mkt_attr";

function readPrevSnapshot(): AttributionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionSnapshot;
  } catch {
    return null;
  }
}

/**
 * Bootstraps first-party marketing attribution on marketing pages.
 * Short-link visits (/a?id) arrive with a clean URL + mkt_camp_entry cookie;
 * that cookie is consumed here so attribution works without query params in the bar.
 */
export function MarketingAttributionBootstrap() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const booted = useRef(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const requireConsent = process.env.NEXT_PUBLIC_MARKETING_REQUIRE_CONSENT === "1";
    let consent = getMarketingConsent();
    if (!requireConsent && consent === "UNKNOWN") {
      setMarketingConsent("GRANTED");
      consent = "GRANTED";
    }
    if (consent !== "GRANTED") return;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const prev = readPrevSnapshot();
    const pendingEntry = consumePendingCampaignEntry();
    const isFirstBoot = !booted.current;
    const genuineNew = isGenuineNewCampaignEntry(params, prev, pendingEntry);
    const hasEntry = Boolean(pendingEntry?.campaignParam) || urlHasCampaignEntry(params);

    const snapshot = getOrCreateAttributionSnapshot({ pendingEntry });
    if (!snapshot) return;

    const pathKey = `${pathname ?? ""}?${params.toString()}`;
    const pathChanged = lastPath.current !== null && lastPath.current !== pathKey;
    lastPath.current = pathKey;
    booted.current = true;

    const shouldTouch = isFirstBoot || genuineNew || (isFirstBoot && hasEntry);

    void captureAttributionToServer(snapshot, {
      forceTouch: shouldTouch,
    }).then(() => {
      if (isFirstBoot || pathChanged) {
        void trackMarketingEvent("PageView", {
          path: pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/"),
          title: typeof document !== "undefined" ? document.title : "",
          campaign: getStoredAttribution()?.campaignParam,
        });
      }
    });
  }, [pathname, searchParams]);

  return null;
}
