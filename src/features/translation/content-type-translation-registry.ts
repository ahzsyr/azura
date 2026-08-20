import type { ContentFieldDefinition } from "@/features/content/types";
import { ENTITY_REGISTRY, type EntityFieldDef } from "./entity-registry";

const ATTRIBUTE_FIELD_PREFIX = "attr:";

function mapSchemaFieldType(
  type: ContentFieldDefinition["type"],
): EntityFieldDef["type"] {
  if (type === "textarea" || type === "json") return "textarea";
  return "text";
}

/**
 * Dynamic translatable fields from ContentType.fieldSchema (localized attribute keys).
 */
export function getSchemaAttributeTranslatableFields(
  fieldSchema: ContentFieldDefinition[],
): EntityFieldDef[] {
  return fieldSchema
    .filter((field) => field.localized)
    .map((field) => ({
      field: `${ATTRIBUTE_FIELD_PREFIX}${field.key}`,
      label: field.labelEn,
      type: mapSchemaFieldType(field.type),
      required: field.required,
    }));
}

/**
 * Merge static ContentItem registry fields with schema-driven localized attribute fields.
 */
export function getContentItemTranslatableFields(
  fieldSchema: ContentFieldDefinition[] = [],
): EntityFieldDef[] {
  const base = ENTITY_REGISTRY.ContentItem.fields;
  const schemaFields = getSchemaAttributeTranslatableFields(fieldSchema);
  const seen = new Set(base.map((f) => f.field));
  const merged = [...base];
  for (const field of schemaFields) {
    if (!seen.has(field.field)) {
      merged.push(field);
      seen.add(field.field);
    }
  }
  return merged;
}

export function isAttributeTranslationField(field: string): boolean {
  return field.startsWith(ATTRIBUTE_FIELD_PREFIX);
}

export function attributeKeyFromTranslationField(field: string): string | null {
  if (!isAttributeTranslationField(field)) return null;
  return field.slice(ATTRIBUTE_FIELD_PREFIX.length);
}

export function translationFieldFromAttributeKey(key: string): string {
  return `${ATTRIBUTE_FIELD_PREFIX}${key}`;
}
