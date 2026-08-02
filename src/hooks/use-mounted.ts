"use client";

import { useEffect, useState } from "react";

/** Avoid hydration mismatches for client-only UI. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
