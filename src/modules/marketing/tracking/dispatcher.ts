import type { CanonicalTrackingEvent } from "@/modules/marketing/core/dto/types";
import { findByCapability } from "@/modules/marketing/core/registry";
import { isMarketingCapabilityEnabled } from "@/modules/marketing/feature-flags";

export async function dispatchTrackingEvent(event: CanonicalTrackingEvent) {
  if (!isMarketingCapabilityEnabled("tracking")) {
    return { dispatched: 0, results: [] as Array<{ providerId: string; ok: boolean; message?: string }> };
  }

  const providers = findByCapability("tracking").filter((p) => typeof p.trackEvent === "function");
  const results = [];
  for (const provider of providers) {
    const result = await provider.trackEvent!(event);
    results.push({ providerId: provider.id, ok: result.ok, message: result.message });
  }
  return { dispatched: results.length, results };
}
