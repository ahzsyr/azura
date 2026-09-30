"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 769px)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** SSR defaults to false so touch sliders render native scroll tracks (matches mobile hydration). */
function getServerSnapshot() {
  return false;
}

export function useIsMdUpViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
