import type { EntityTranslationInput } from "@/features/translation/types";

const SEP = "|||";

export function buildWorkspaceOverrideKey(
  entityType: string,
  entityId: string,
  field: string,
  localeCode: string,
): string {
  return `${entityType}${SEP}${entityId}${SEP}${field}${SEP}${localeCode}`;
}

export function parseWorkspaceOverrideKey(key: string): {
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
} | null {
  const parts = key.split(SEP);
  if (parts.length !== 4) return null;
  return {
    entityType: parts[0]!,
    entityId: parts[1]!,
    field: parts[2]!,
    localeCode: parts[3]!,
  };
}

export function workspaceEntityKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export function workspaceOverrideMapToInputs(map: Map<string, string>): EntityTranslationInput[] {
  const inputs: EntityTranslationInput[] = [];
  for (const [key, value] of map) {
    const parsed = parseWorkspaceOverrideKey(key);
    if (!parsed || !value.trim()) continue;
    inputs.push({
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      field: parsed.field,
      localeCode: parsed.localeCode.toLowerCase(),
      value,
      status: "PUBLISHED",
    });
  }
  return inputs;
}
