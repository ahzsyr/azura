import { getEntityTypeDefinition } from "@/features/entities/preset-registry";
import type { EntityPresetId } from "@/features/entities/types";

/** Canonical preset manifest — release changelog (entity preset deferred). */
export const RELEASE_PRESET_ID = "release" as const;

export function getReleasePresetDefinition() {
  return getEntityTypeDefinition(RELEASE_PRESET_ID as EntityPresetId);
}
