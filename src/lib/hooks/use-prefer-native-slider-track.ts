"use client";

import { useSyncExternalStore } from "react";
import {
  BUILDER_DESKTOP_MIN_PX,
  SLIDER_NATIVE_MAX_PX,
} from "@/features/builder/constants/responsive-breakpoints";

const SLIDER_NATIVE_MAX_QUERY = `(max-width: ${SLIDER_NATIVE_MAX_PX}px)`;
const TOUCH_PRIMARY_QUERY = "(hover: none) and (pointer: coarse)";
const ANY_COARSE_POINTER_QUERY = "(any-pointer: coarse)";
const DESKTOP_POINTER_QUERY = `(min-width: ${BUILDER_DESKTOP_MIN_PX}px) and (hover: hover) and (pointer: fine)`;

const MEDIA_QUERIES = [
  SLIDER_NATIVE_MAX_QUERY,
  TOUCH_PRIMARY_QUERY,
  ANY_COARSE_POINTER_QUERY,
  DESKTOP_POINTER_QUERY,
] as const;

function subscribe(onStoreChange: () => void) {
  const listeners = MEDIA_QUERIES.map((query) => {
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

function hasTouchCapability(): boolean {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
}

function isConfirmedDesktopPointer(): boolean {
  return (
    window.matchMedia(DESKTOP_POINTER_QUERY).matches && !hasTouchCapability()
  );
}

function prefersNativeSliderTrack(): boolean {
  if (typeof window === "undefined") return true;
  if (isConfirmedDesktopPointer()) return false;
  return (
    window.matchMedia(SLIDER_NATIVE_MAX_QUERY).matches ||
    window.matchMedia(TOUCH_PRIMARY_QUERY).matches ||
    window.matchMedia(ANY_COARSE_POINTER_QUERY).matches ||
    hasTouchCapability()
  );
}

/** SSR defaults to true so touch sliders render native scroll tracks (matches mobile hydration). */
function getServerSnapshot() {
  return true;
}

/** True when sliders should use native CSS scroll instead of Embla (mobile/tablet or touch-primary). */
export function usePreferNativeSliderTrack() {
  return useSyncExternalStore(subscribe, prefersNativeSliderTrack, getServerSnapshot);
}
