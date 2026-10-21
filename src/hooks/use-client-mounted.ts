"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Avoid SSR/client mismatches for libraries that assign runtime IDs (e.g. dnd-kit). */
export function useClientMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
