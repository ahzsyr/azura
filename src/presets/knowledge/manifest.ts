import { getEntityTypeDefinition } from "@/features/entities/preset-registry";

/** Canonical preset manifest — registry remains source of truth for metadata. */
export const KNOWLEDGE_PRESET_ID = "knowledge" as const;

export function getKnowledgePresetDefinition() {
  return getEntityTypeDefinition(KNOWLEDGE_PRESET_ID);
}
