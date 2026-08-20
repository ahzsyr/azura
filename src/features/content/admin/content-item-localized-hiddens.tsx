"use client";

import type { PublicLocale } from "@/i18n/locale-config";
import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import {
  CONTENT_ITEM_CORE_LOCALE_FIELDS,
  getLocalizedAttributeStorageKey,
  type ContentItemLocaleFields,
} from "@/features/content/admin/content-editor-form-data";

export function ContentItemLocalizedFormHiddens({
  localeFields,
  locales,
  fieldKeys = CONTENT_ITEM_CORE_LOCALE_FIELDS,
}: {
  localeFields: ContentItemLocaleFields;
  locales: PublicLocale[];
  fieldKeys?: string[];
}) {
  return (
    <>
      {fieldKeys.flatMap((fieldKey) =>
        locales.map((locale) => {
          const name = getLocalizedFormFieldName(fieldKey, locale.code);
          const value = localeFields[fieldKey]?.[locale.code] ?? "";
          return <input key={name} type="hidden" name={name} value={value} readOnly />;
        }),
      )}
    </>
  );
}

export function ContentItemLocalizedAttributeHiddens({
  attributes,
  locales,
  localizedFieldKeys,
}: {
  attributes: Record<string, unknown>;
  locales: PublicLocale[];
  localizedFieldKeys: string[];
}) {
  return (
    <>
      {localizedFieldKeys.flatMap((fieldKey) =>
        locales.map((locale) => {
          const name = getLocalizedFormFieldName(fieldKey, locale.code);
          const storageKey = getLocalizedAttributeStorageKey(fieldKey, locale.code);
          const raw = attributes[storageKey] ?? attributes[`${fieldKey}_${locale.code}`] ?? "";
          const value = typeof raw === "string" ? raw : raw == null ? "" : JSON.stringify(raw);
          return <input key={name} type="hidden" name={name} value={value} readOnly />;
        }),
      )}
    </>
  );
}
