import { getEntityTypeDefinition } from "@/features/entities/preset-registry";

/** Canonical preset manifest — registry remains source of truth for metadata. */
export const PRICING_PRESET_ID = "pricing" as const;

export function getPricingPresetDefinition() {
  return getEntityTypeDefinition(PRICING_PRESET_ID);
}
