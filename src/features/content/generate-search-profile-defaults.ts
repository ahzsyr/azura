import type { ContentFieldDefinition } from "@/features/content/types";

const SEARCHABLE_TYPES = new Set<ContentFieldDefinition["type"]>(["text", "textarea", "url"]);
const FACET_TYPES = new Set<ContentFieldDefinition["type"]>(["select", "boolean", "number", "date"]);

/**
 * Apply default `search` flags on fieldSchema entries when not explicitly set.
 */
export function applyDefaultSearchFlags(
  fieldSchema: ContentFieldDefinition[],
): ContentFieldDefinition[] {
  return fieldSchema.map((field) => {
    if (field.search !== undefined) return field;
    if (field.localized && SEARCHABLE_TYPES.has(field.type)) {
      return { ...field, search: true };
    }
    if (FACET_TYPES.has(field.type)) {
      return { ...field, search: { facet: true } };
    }
    if (SEARCHABLE_TYPES.has(field.type)) {
      return { ...field, search: true };
    }
    return field;
  });
}

/**
 * Merge generated search defaults into adminConfig when search.index is absent.
 */
export function mergeSearchDefaultsIntoAdminConfig(
  adminConfig: Record<string, unknown>,
  fieldSchema: ContentFieldDefinition[],
): Record<string, unknown> {
  const search =
    adminConfig.search && typeof adminConfig.search === "object" && !Array.isArray(adminConfig.search)
      ? (adminConfig.search as Record<string, unknown>)
      : {};

  if (search.index && typeof search.index === "object") {
    return adminConfig;
  }

  const withFlags = applyDefaultSearchFlags(fieldSchema);
  const customFields = withFlags.filter((f) => f.search !== false && f.search !== undefined);

  return {
    ...adminConfig,
    search: {
      ...search,
      index: {
        fields: {
          custom_fields: customFields.length > 0 ? true : undefined,
        },
      },
    },
  };
}
