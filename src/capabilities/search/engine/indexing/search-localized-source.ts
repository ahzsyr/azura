import "server-only";

import { translationService } from "@/features/translation/translation.service";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";
import type { LocalizedValueMap } from "@/features/translation/types";

export type LocalizedSearchFields = {
  title?: LocalizedValueMap;
  excerpt?: LocalizedValueMap;
  content?: LocalizedValueMap;
  description?: LocalizedValueMap;
  question?: LocalizedValueMap;
  answer?: LocalizedValueMap;
  quote?: LocalizedValueMap;
  alt?: LocalizedValueMap;
  name?: LocalizedValueMap;
  role?: LocalizedValueMap;
  bio?: LocalizedValueMap;
  location?: LocalizedValueMap;
};

export async function loadLocalizedSearchFields(
  entityType: string,
  entityId: string,
  fields: string[]
): Promise<LocalizedSearchFields> {
  const translations = await translationService.getForEntity(entityType, entityId);
  const out = {} as LocalizedSearchFields;
  for (const field of fields) {
    (out as Record<string, LocalizedValueMap>)[field] = toLocalizedRecord(translations, field);
  }
  return out;
}

export async function withLocalizedSearchFields<
  T extends { id: string; slug?: string; status?: string },
>(
  entityType: string,
  base: T,
  fields: string[]
): Promise<T & LocalizedSearchFields> {
  const localized = await loadLocalizedSearchFields(entityType, base.id, fields);
  return { ...base, ...localized };
}
