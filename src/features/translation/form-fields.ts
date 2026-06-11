import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import type { EntityTranslationInput } from "./types";
import type { TranslationStatus } from "@prisma/client";
import { extractLegacyColumns as extractLegacyColumnsFromAdapter } from "./legacy-adapter";

const CORE_FIELDS = ["title", "excerpt", "description", "name", "content"];

/**
 * Parse form fields using both legacy column names (titleEn) and translation pattern (title_en).
 * Client-safe — no server-only imports.
 */
export function parseFormTranslations(
  formData: FormData,
  entityType: string,
  entityId: string,
  locales: PublicLocale[],
  fields: string[] = CORE_FIELDS
): EntityTranslationInput[] {
  const inputs: EntityTranslationInput[] = [];

  for (const field of fields) {
    for (const locale of locales) {
      const suffix = getContentFieldSuffix(locale.code);
      const legacyName = `${field}${suffix}`;
      const modernName = `${field}_${locale.code}`;

      const raw = formData.get(modernName) ?? formData.get(legacyName);
      if (raw === null || raw === undefined) continue;

      const value = String(raw);
      inputs.push({
        entityType,
        entityId,
        field,
        languageCode: locale.code,
        value,
        status: (formData.get(`${modernName}_status`) as TranslationStatus) ?? "PUBLISHED",
      });
    }
  }

  return inputs;
}

/** @deprecated Use legacy-adapter.extractLegacyColumns */
export function extractLegacyColumns(
  formData: FormData,
  locales: PublicLocale[],
  field: string
): Record<string, string> {
  return extractLegacyColumnsFromAdapter(formData, locales, field);
}
