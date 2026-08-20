import type { EntityTranslation } from "@prisma/client";
import { translationService } from "@/features/translation/translation.service";
import { resolveCanonicalFields, resolveTranslation } from "@/features/translation/translation-resolver";
/** @deprecated Use translationService.getForEntities + resolveTranslation or translationService.resolveField */
export async function loadTranslationsMap(
  entityType: string,
  entityIds: string[]
): Promise<Map<string, EntityTranslation[]>> {
  if (entityIds.length === 0) return new Map();
  return translationService.getForEntities(entityType, entityIds);
}

/** Default-locale string for one canonical field from EntityTranslation rows. */
export function localizedFieldValue(
  translations: EntityTranslation[],
  field: string,
  defaultCode = "en"
): string {
  return resolveTranslation(field, defaultCode, { translations, defaultCode });
}

/** Default-locale values for multiple canonical fields. */
export function mergeCanonicalFields(
  translations: EntityTranslation[],
  fields: string[],
  defaultCode = "en"
): Record<string, string> {
  return resolveCanonicalFields(fields, { translations, defaultCode });
}

/** Alias for mergeCanonicalFields — canonical field values from EntityTranslation rows. */
export function canonicalFieldValues(
  translations: EntityTranslation[],
  fields: string[],
  defaultCode = "en"
): Record<string, string> {
  return mergeCanonicalFields(translations, fields, defaultCode);
}

export function nullableExcerptField(
  translations: EntityTranslation[],
  field: string,
  defaultCode = "en"
): string | null {
  const value = localizedFieldValue(translations, field, defaultCode);
  return value || null;
}

/** @deprecated Use localizedFieldValue — returns default-locale value under legacy En/Ar keys. */
export function localizedPair<F extends string>(
  translations: EntityTranslation[],
  field: F,
  defaultCode = "en"
): Record<`${F}En` | `${F}Ar`, string> {
  const value = localizedFieldValue(translations, field, defaultCode);
  return {
    [`${field}En`]: value,
    [`${field}Ar`]: resolveTranslation(field, "ar", { translations, defaultCode }),
  } as Record<`${F}En` | `${F}Ar`, string>;
}

/** @deprecated Use mergeCanonicalFields. */
export function mergeLocalizedPairs(
  translations: EntityTranslation[],
  fields: string[],
  defaultCode = "en"
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    Object.assign(out, localizedPair(translations, field, defaultCode));
  }
  return out;
}

/** @deprecated Use nullableExcerptField. */
export function nullableExcerptPair(
  translations: EntityTranslation[],
  field: string,
  defaultCode = "en"
): { [K in `${typeof field}En` | `${typeof field}Ar`]: string | null } {
  const pair = localizedPair(translations, field, defaultCode);
  return {
    [`${field}En`]: pair[`${field}En` as `${typeof field}En`] || null,
    [`${field}Ar`]: pair[`${field}Ar` as `${typeof field}Ar`] || null,
  } as { [K in `${typeof field}En` | `${typeof field}Ar`]: string | null };
}
