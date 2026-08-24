import type { ContentFieldDefinition } from "@/features/content/types";
import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";

export function buildAttributesFromForm(
  formData: FormData,
  fields: ContentFieldDefinition[],
  locales: PublicLocale[] = [],
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.localized) {
      if (locales.length > 0) {
        for (const locale of locales) {
          const formName = getLocalizedFormFieldName(field.key, locale.code);
          const storageKey = `${field.key}${getContentFieldSuffix(locale.code)}`;
          const raw = formData.get(formName);
          if (field.type === "json") {
            attrs[storageKey] = parseJsonField(raw);
          } else if (raw != null && String(raw).length > 0) {
            attrs[storageKey] = String(raw);
          }
        }
      } else {
        const en = formData.get(`${field.key}En`);
        const ar = formData.get(`${field.key}Ar`);
        if (field.type === "json") {
          attrs[`${field.key}En`] = parseJsonField(en);
          attrs[`${field.key}Ar`] = parseJsonField(ar);
        } else {
          if (en) attrs[`${field.key}En`] = String(en);
          if (ar) attrs[`${field.key}Ar`] = String(ar);
        }
      }
    } else {
      const val = formData.get(field.key);
      if (field.type === "boolean") {
        attrs[field.key] = val === "true";
      } else if (field.type === "number" || field.type === "price") {
        attrs[field.key] = val ? Number(val) : null;
      } else if (field.type === "json") {
        attrs[field.key] = parseJsonField(val);
      } else if (val) {
        attrs[field.key] = String(val);
      }
    }
  }
  return attrs;
}

function parseJsonField(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string" || !raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
