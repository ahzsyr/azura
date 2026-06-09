"use client";

import { useCallback, useEffect } from "react";
import {
  refreshCapabilities,
  subscribeCapabilityChanges,
} from "@/lib/theme/effects/capability-engine";
import { THEME_CHANGE_EVENT } from "@/features/theme/engine";

/** Initializes device capability tiers on storefront and re-applies effects when tier changes. */
export function CapabilityInit() {
  const notifyEffectsRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    refreshCapabilities();
    let skipInitial = true;
    return subscribeCapabilityChanges(() => {
      if (skipInitial) {
        skipInitial = false;
        return;
      }
      notifyEffectsRefresh();
    });
  }, [notifyEffectsRefresh]);

  return null;
}
