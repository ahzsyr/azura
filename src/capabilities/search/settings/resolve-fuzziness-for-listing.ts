import type { AdminSearchSettings } from "@/capabilities/search/settings/admin-search-settings.schema";

const FUZZINESS_PRESETS: Record<string, number> = {
  strict: 0.24,
  balanced: 0.35,
  fuzzy: 0.48,
};

/**
 * Resolve a single numeric fuzziness value for product listing Fuse.js search.
 * Reads from admin fuzziness preset or legacy listingFuzziness.
 */
export function resolveFuzzynessForListing(settings: AdminSearchSettings): number {
  const fuzz = settings.fuzziness;
  if (fuzz === "strict" || fuzz === "balanced" || fuzz === "fuzzy") {
    return FUZZINESS_PRESETS[fuzz];
  }
  if (typeof settings.listingFuzziness === "number" && Number.isFinite(settings.listingFuzziness)) {
    return Math.min(0.6, Math.max(0.1, settings.listingFuzziness));
  }
  return FUZZINESS_PRESETS.balanced;
}
