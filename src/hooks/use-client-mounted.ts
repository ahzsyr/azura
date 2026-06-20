"use client";

import { useEffect, useState } from "react";

/** Avoid SSR/client mismatches for libraries that assign runtime IDs (e.g. dnd-kit). */
export function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
