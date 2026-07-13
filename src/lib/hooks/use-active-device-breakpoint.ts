"use client";

import { useSyncExternalStore } from "react";
import {
  BUILDER_DESKTOP_MIN_PX,
  BUILDER_MOBILE_MAX_PX,
  BUILDER_TABLET_MAX_PX,
} from "@/features/builder/constants/responsive-breakpoints";
import type { DeviceBreakpoint } from "@/types/block-system";

const QUERIES = {
  mobile: `(max-width: ${BUILDER_MOBILE_MAX_PX}px)`,
  tablet: `(min-width: ${BUILDER_MOBILE_MAX_PX + 1}px) and (max-width: ${BUILDER_TABLET_MAX_PX}px)`,
  desktop: `(min-width: ${BUILDER_DESKTOP_MIN_PX}px)`,
} as const;

function subscribe(onStoreChange: () => void) {
  const listeners = Object.values(QUERIES).map((query) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onStoreChange);
    return mq;
  });
  return () => {
    for (const mq of listeners) {
      mq.removeEventListener("change", onStoreChange);
    }
  };
}

function resolveActiveDevice(): DeviceBreakpoint {
  if (window.matchMedia(QUERIES.mobile).matches) return "mobile";
  if (window.matchMedia(QUERIES.tablet).matches) return "tablet";
  return "desktop";
}

/** SSR defaults to mobile — matches the mobile-first device shell CSS. */
function getServerSnapshot(): DeviceBreakpoint {
  return "mobile";
}

/** Current builder device breakpoint aligned with block-overflow.css shells. */
export function useActiveDeviceBreakpoint(): DeviceBreakpoint {
  return useSyncExternalStore(subscribe, resolveActiveDevice, getServerSnapshot);
}
