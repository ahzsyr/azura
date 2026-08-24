"use client";

import { useSyncExternalStore } from "react";
import {
  BUILDER_BREAKPOINT_MQ,
  BUILDER_DESKTOP_MIN_PX,
  BUILDER_MOBILE_MAX_PX,
  BUILDER_TABLET_MAX_PX,
} from "@/features/builder/constants/responsive-breakpoints";

export {
  BUILDER_BREAKPOINT_MQ,
  BUILDER_DESKTOP_MIN_PX,
  BUILDER_MOBILE_MAX_PX,
  BUILDER_TABLET_MAX_PX,
};

export type ProductPageViewport = "desktop" | "tablet" | "mobile";

/** Non-desktop (tablet + mobile) — legacy PDP description panel behavior. */
export const PDP_NON_DESKTOP_QUERY = `(max-width: ${BUILDER_TABLET_MAX_PX}px)`;

export function resolveProductPageViewport(width: number): ProductPageViewport {
  if (width >= BUILDER_DESKTOP_MIN_PX) return "desktop";
  if (width > BUILDER_MOBILE_MAX_PX) return "tablet";
  return "mobile";
}

function getViewportSnapshot(): ProductPageViewport {
  if (typeof window === "undefined") return "desktop";
  return resolveProductPageViewport(window.innerWidth);
}

function subscribeViewport(onStoreChange: () => void): () => void {
  const queries = [
    window.matchMedia(BUILDER_BREAKPOINT_MQ.mobile),
    window.matchMedia(BUILDER_BREAKPOINT_MQ.tablet),
    window.matchMedia(BUILDER_BREAKPOINT_MQ.desktop),
  ];
  for (const mq of queries) {
    mq.addEventListener("change", onStoreChange);
  }
  return () => {
    for (const mq of queries) {
      mq.removeEventListener("change", onStoreChange);
    }
  };
}

export function useProductPageViewport(): ProductPageViewport {
  return useSyncExternalStore(subscribeViewport, getViewportSnapshot, () => "desktop");
}
