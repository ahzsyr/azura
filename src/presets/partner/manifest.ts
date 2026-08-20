import { getEntityTypeDefinition } from "@/features/entities/preset-registry";

export const PARTNER_PRESET_ID = "partner" as const;

export function getPartnerPresetDefinition() {
  return getEntityTypeDefinition(PARTNER_PRESET_ID);
}
