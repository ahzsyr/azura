import type { EntityTranslation } from "@prisma/client";
import { ENTITY_REGISTRY } from "@/features/translation/entity-registry";
import { resolveAdminFieldValue } from "@/features/translation/admin-field-value";
import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";

export type ContentItemLocaleFields = Record<string, Record<string, string>>;

export const CONTENT_ITEM_CORE_LOCALE_FIELDS = ENTITY_REGISTRY.ContentItem.fields
  .map((field) => field.field)
  .filter((field) => field !== "seoTitle" && field !== "seoDescription");

export function buildContentItemLocaleFields(
  translations: Array<Pick<EntityTranslation, "field" | "localeCode" | "value">>,
  locales: PublicLocale[],
  fieldKeys: string[] = CONTENT_ITEM_CORE_LOCALE_FIELDS,
  legacyItem?: Record<string, unknown>,
): ContentItemLocaleFields {
  const defaultLocaleCode = locales.find((locale) => locale.isDefault)?.code ?? locales[0]?.code ?? "en";
  const byField: Record<string, Record<string, string>> = {};

  for (const row of translations) {
    if (!fieldKeys.includes(row.field)) continue;
    if (!byField[row.field]) byField[row.field] = {};
    byField[row.field]![row.localeCode] = row.value;
  }

  const fields: ContentItemLocaleFields = {};
  for (const fieldKey of fieldKeys) {
    fields[fieldKey] = {};
    const values = byField[fieldKey] ?? {};
    for (const locale of locales) {
      fields[fieldKey]![locale.code] = resolveAdminFieldValue(
        values,
        legacyItem,
        fieldKey,
        locale.code,
        defaultLocaleCode,
      );
    }
  }
  return fields;
}

export function getLocalizedAttributeStorageKey(fieldKey: string, localeCode: string): string {
  return `${fieldKey}${getContentFieldSuffix(localeCode)}`;
}

/** Read core Details-tab translations from submitted form fields. */
export function readContentItemLocaleFieldsFromForm(
  formData: FormData,
  locales: PublicLocale[],
  fieldKeys: string[] = CONTENT_ITEM_CORE_LOCALE_FIELDS,
): ContentItemLocaleFields {
  const fields: ContentItemLocaleFields = {};
  for (const fieldKey of fieldKeys) {
    fields[fieldKey] = {};
    for (const locale of locales) {
      const name = getLocalizedFormFieldName(fieldKey, locale.code);
      fields[fieldKey]![locale.code] = String(formData.get(name) ?? "");
    }
  }
  return fields;
}
