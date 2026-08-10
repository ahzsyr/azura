"use client";

import { useCallback } from "react";
import { trackHelpEvent } from "@/features/help/lib/analytics";
import type { HelpAnalyticsEvent } from "@/features/help/types";

export function useHelpAnalytics() {
  const track = useCallback((event: HelpAnalyticsEvent) => {
    trackHelpEvent(event);
  }, []);

  return { track };
}
