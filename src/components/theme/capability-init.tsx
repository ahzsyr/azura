"use client";

import { useCallback, useEffect } from "react";
import {
  refreshCapabilities,
  subscribeCapabilityChanges,
} from "@/lib/theme/effects/capability-engine";
import { dispatchThemeChange } from "@/features/theme/engine";

/**
 * Initializes device capability tiers on storefront.
 * Dispatches capabilitiesOnly theme events — consumers may remount canvases /
 * refresh effect policy, but must never restore appearance colors or theme-color.
 */
export function CapabilityInit() {
  const notifyCapabilitiesChanged = useCallback(() => {
    dispatchThemeChange({ capabilitiesOnly: true });
  }, []);

  useEffect(() => {
    refreshCapabilities();
    let skipInitial = true;
    return subscribeCapabilityChanges(() => {
      if (skipInitial) {
        skipInitial = false;
        return;
      }
      notifyCapabilitiesChanged();
    });
  }, [notifyCapabilitiesChanged]);

  return null;
}
