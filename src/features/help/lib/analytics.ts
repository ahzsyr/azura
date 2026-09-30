import type { HelpAnalyticsEvent } from "@/features/help/types";

/**
 * No-PII analytics stubs. Wire to real telemetry later without changing call sites.
 */
export function trackHelpEvent(event: HelpAnalyticsEvent): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[help:analytics]", event);
  }
}
