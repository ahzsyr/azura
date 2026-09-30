"use client";

import { useEffect } from "react";
import {
  refreshCapabilities,
  subscribeCapabilityChanges,
} from "@/lib/theme/effects/capability-engine";

/** Initializes device capability tiers on admin routes (sets data-reduced-paint on html). */
export function AdminCapabilityInit() {
  useEffect(() => {
    refreshCapabilities();
    return subscribeCapabilityChanges(() => {});
  }, []);

  return null;
}
