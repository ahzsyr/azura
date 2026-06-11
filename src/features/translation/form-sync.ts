import type { PublicLocale } from "@/i18n/locale-config";
import { getEntityConfig } from "./entity-registry";
import { translationService } from "./translation.service";
import { extractLegacyColumns, parseFormTranslations } from "./form-fields";

export { extractLegacyColumns, parseFormTranslations } from "./form-fields";

/**
 * Sync EntityTranslation rows from admin form submission (server-only).
 */
export async function syncEntityTranslationsFromForm(
  formData: FormData,
  entityType: string,
  entityId: string,
  locales: PublicLocale[],
  fields?: string[]
) {
  const config = getEntityConfig(entityType);
  const fieldList = fields ?? config?.legacyFields ?? ["title", "excerpt", "description", "name", "content"];
  const inputs = parseFormTranslations(formData, entityType, entityId, locales, fieldList);
  const nonEmpty = inputs.filter((i) => i.value.trim());
  if (nonEmpty.length > 0) {
    await translationService.upsertMany(nonEmpty);
  }
  return nonEmpty.length;
}
