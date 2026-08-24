import type { EntityTranslation } from "@prisma/client";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import type { LocalizedValueMap } from "@/features/translation/types";

function bundleKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function getBundleTranslations(
  bundle: TranslationBundle,
  entityType: string,
  entityId: string
): EntityTranslation[] {
  return bundle.byEntity[bundleKey(entityType, entityId)] ?? [];
}

export function localizedField(
  bundle: TranslationBundle,
  entityType: string,
  entityId: string,
  field: string
): LocalizedValueMap {
  return toLocalizedRecord(getBundleTranslations(bundle, entityType, entityId), field);
}

/** Build suffixed keys (titleEn, name_ar, …) for admin form legacyEntity props. */
export function legacyShapeFromBundle(
  bundle: TranslationBundle,
  entityType: string,
  entityId: string,
  fields: string[]
): Record<string, string> {
  const translations = getBundleTranslations(bundle, entityType, entityId);
  const out: Record<string, string> = {};
  for (const field of fields) {
    const map = toLocalizedRecord(translations, field);
    for (const [localeCode, value] of Object.entries(map)) {
      const suffix = getContentFieldSuffix(localeCode);
      const key =
        suffix === "En" || suffix === "Ar" ? `${field}${suffix}` : `${field}_${localeCode}`;
      out[key] = value;
    }
  }
  return out;
}

export function legacyShapeFromTranslations(
  translations: EntityTranslation[],
  fields: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const map = toLocalizedRecord(translations, field);
    for (const [localeCode, value] of Object.entries(map)) {
      const suffix = getContentFieldSuffix(localeCode);
      const key =
        suffix === "En" || suffix === "Ar" ? `${field}${suffix}` : `${field}_${localeCode}`;
      out[key] = value;
    }
  }
  return out;
}
