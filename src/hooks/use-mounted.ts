"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Avoid hydration mismatches for client-only UI (no setState-in-effect). */
export function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
