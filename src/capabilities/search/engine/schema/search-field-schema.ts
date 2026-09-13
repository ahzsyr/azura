import type { ContentFieldDefinition } from "@/features/content/types";

export type SearchFieldConfig =
  | boolean
  | {
      weight?: number;
      facet?: boolean;
    };

/** Extend field definitions with optional search flags (stored in ContentType.fieldSchema JSON). */
export type SearchableFieldDefinition = ContentFieldDefinition & {
  search?: SearchFieldConfig;
};

const DEFAULT_SEARCHABLE_FIELD_TYPES = new Set<ContentFieldDefinition["type"]>([
  "text",
  "textarea",
  "url",
]);

export function isFieldSearchable(field: SearchableFieldDefinition): boolean {
  if (field.search === false) return false;
  if (field.search === true) return true;
  if (field.search && typeof field.search === "object") return true;
  return DEFAULT_SEARCHABLE_FIELD_TYPES.has(field.type);
}

export function fieldSearchWeight(field: SearchableFieldDefinition): number {
  if (field.search && typeof field.search === "object" && typeof field.search.weight === "number") {
    return field.search.weight;
  }
  return 1;
}

function stringifyAttributeValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stringifyAttributeValue).filter(Boolean).join(" ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Schema-driven body enrichment from ContentItem.attributes using fieldSchema.
 */
export function extractSearchableAttributeText(
  attributes: Record<string, unknown>,
  fieldSchema: SearchableFieldDefinition[]
): string {
  const parts: string[] = [];
  for (const field of fieldSchema) {
    if (!isFieldSearchable(field)) continue;
    const raw = attributes[field.key];
    const text = stringifyAttributeValue(raw);
    if (text.trim()) parts.push(text.trim());
  }
  return parts.join("\n");
}

export function buildSearchBody(
  baseParts: string[],
  attributes: Record<string, unknown>,
  fieldSchema: SearchableFieldDefinition[]
): string {
  const merged = [...baseParts.filter(Boolean), extractSearchableAttributeText(attributes, fieldSchema)];
  return merged.join("\n").trim();
}

export function extractFacetValues(
  attributes: Record<string, unknown>,
  fieldSchema: SearchableFieldDefinition[]
): Record<string, string | string[]> {
  const facets: Record<string, string | string[]> = {};
  for (const field of fieldSchema) {
    const cfg = field.search;
    const facetEnabled =
      cfg === true || (cfg && typeof cfg === "object" && cfg.facet === true);
    if (!facetEnabled) continue;
    const raw = attributes[field.key];
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      facets[field.key] = raw.map((v) => stringifyAttributeValue(v)).filter(Boolean);
    } else {
      const s = stringifyAttributeValue(raw);
      if (s) facets[field.key] = s;
    }
  }
  return facets;
}
