import type { PublicLocale } from "@/i18n/locale-config";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import type { EntityTranslationInput } from "./types";
import type { TranslationStatus } from "@prisma/client";

const CORE_FIELDS = ["title", "excerpt", "description", "name", "content"];

function readLocalizedFormField(
  formData: FormData,
  field: string,
  localeCode: string
): string | null {
  const suffix = getContentFieldSuffix(localeCode);
  const legacyName = `${field}${suffix}`;
  const modernName = `${field}_${localeCode}`;
  const raw = formData.get(modernName) ?? formData.get(legacyName);
  if (raw === null || raw === undefined) return null;
  return String(raw);
}

/** Read default-locale title (or other field) from translation form inputs. */
export function getDefaultLocaleFieldFromForm(
  formData: FormData,
  locales: PublicLocale[],
  field: string
): string {
  const defaultCode =
    locales.find((l) => l.isDefault)?.code ?? locales[0]?.code ?? DEFAULT_ADMIN_LOCALE.code;
  return readLocalizedFormField(formData, field, defaultCode)?.trim() ?? "";
}

/**
 * Parse form fields using translation pattern `{field}_{localeCode}`.
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
      const legacyName =
        suffix === "En" || suffix === "Ar" ? `${field}${suffix}` : `${field}_${locale.code}`;
      const modernName = `${field}_${locale.code}`;
      const raw = formData.get(modernName) ?? formData.get(legacyName);
      if (raw === null || raw === undefined) continue;

      const value = String(raw);
      inputs.push({
        entityType,
        entityId,
        field,
        localeCode: locale.code,
        value,
        status:
          (formData.get(`${modernName}_status`) as TranslationStatus) ??
          (formData.get(`${legacyName}_status`) as TranslationStatus) ??
          "PUBLISHED",
      });
    }
  }

  return inputs;
}
