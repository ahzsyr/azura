/**
 * Standard searchable field keys — per ContentType via adminConfig.search.fields.
 * Custom attribute keys use prefix `custom:` (e.g. `custom:duration`).
 */
export const STANDARD_SEARCH_INDEX_FIELDS = [
  "title",
  "name",
  "slug",
  "summary",
  "description",
  "content",
  "tags",
  "categories",
  "collections",
  "custom_fields",
  "seo_fields",
  "metadata",
] as const;

export type StandardSearchIndexFieldKey = (typeof STANDARD_SEARCH_INDEX_FIELDS)[number];

/** `custom:fieldKey` or extension keys `ext:pluginId:field` */
export type SearchIndexFieldKey = StandardSearchIndexFieldKey | `custom:${string}` | `ext:${string}`;

export function isCustomFieldKey(key: string): key is `custom:${string}` {
  return key.startsWith("custom:");
}

export function customFieldKeyFromSchema(key: string): `custom:${string}` {
  return `custom:${key}`;
}
