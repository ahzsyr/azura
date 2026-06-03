/**
 * Legacy En/Ar column adapter — single deprecation boundary for hybrid migration.
 *
 * @deprecated Long-term storage is EntityTranslation only. These helpers exist
 * during Phases 1–4 to read/write `fieldEn` / `fieldAr` Prisma columns.
 */

import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import type { EntityTranslationInput } from "./types";
import { shouldWriteLegacyColumns } from "./i18n-flags";

export function legacyColumnKey(field: string, languageCode: string): string {
  return `${field}${getContentFieldSuffix(languageCode)}`;
}

export function localeHasLegacyColumn(code: string): boolean {
  const suffix = getContentFieldSuffix(code);
  return suffix === "En" || suffix === "Ar";
}

export function legacyColumnLocales(locales: PublicLocale[]): PublicLocale[] {
  return locales.filter((l) => localeHasLegacyColumn(l.code));
}

/**
 * Read a legacy column value for one language code (no fallback chain).
 * @deprecated Use resolveTranslation with EntityTranslation context instead.
 */
export function readLegacyField(
  entity: Record<string, unknown>,
  field: string,
  languageCode: string
): string {
  const key = legacyColumnKey(field, languageCode);
  const value = entity[key];
  if (typeof value === "string" && value.length > 0) return value;
  if (languageCode.toLowerCase() !== "en") {
    const en = entity[`${field}En`];
    if (typeof en === "string" && en.length > 0) return en;
  }
  return "";
}

/**
 * Read legacy column following locale fallback chain.
 * @deprecated Use resolveTranslation instead.
 */
export function readLegacyFieldWithFallback(
  entity: Record<string, unknown>,
  field: string,
  languageCode: string,
  enabledLocales: PublicLocale[],
  defaultCode?: string
): string {
  for (const candidate of resolveLocaleCandidates(
    languageCode,
    enabledLocales,
    defaultCode
  )) {
    const value = readLegacyField(entity, field, candidate);
    if (value) return value;
  }
  const en = entity[`${field}En`];
  return typeof en === "string" ? en : "";
}

/** Extract legacy column values from form for en/ar backward compatibility */
export function extractLegacyColumns(
  formData: FormData,
  locales: PublicLocale[],
  field: string
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const locale of locales) {
    if (!localeHasLegacyColumn(locale.code)) continue;
    const legacyKey = legacyColumnKey(field, locale.code);
    const modernKey = `${field}_${locale.code}`;
    const value = formData.get(modernKey) ?? formData.get(legacyKey);
    if (value !== null && value !== undefined) {
      result[legacyKey] = String(value);
    }
  }
  return result;
}

/**
 * Build Prisma update payload for legacy columns from translation inputs.
 * Only includes en/ar when I18N_WRITE_LEGACY is enabled.
 */
export function syncLegacyColumnsFromTranslations(
  inputs: EntityTranslationInput[],
  fields?: string[]
): Record<string, string> {
  if (!shouldWriteLegacyColumns()) return {};

  const fieldSet = fields ? new Set(fields) : null;
  const result: Record<string, string> = {};

  for (const input of inputs) {
    if (fieldSet && !fieldSet.has(input.field)) continue;
    if (!localeHasLegacyColumn(input.languageCode)) continue;
    if (!input.value.trim()) continue;
    result[legacyColumnKey(input.field, input.languageCode)] = input.value;
  }

  return result;
}

/** Map registry field names to legacy Prisma column base names where they differ */
export const REGISTRY_TO_LEGACY_FIELD: Record<string, Record<string, string>> = {
  ContentItem: {
    subtitle: "excerpt",
    shortDescription: "excerpt",
  },
  CmsPage: {
    subtitle: "excerpt",
    description: "excerpt",
  },
  Testimonial: {
    authorName: "name",
    quote: "content",
    role: "location",
  },
  SeoMeta: {
    metaTitle: "title",
    metaDescription: "description",
    ogDescription: "description",
  },
  TestimonialCollection: {
    description: "excerpt",
  },
  FaqSet: {
    description: "description",
  },
  ContentType: {
    pluralName: "labelPlural",
    description: "name",
  },
};

export function resolveLegacyFieldName(entityType: string, registryField: string): string {
  return REGISTRY_TO_LEGACY_FIELD[entityType]?.[registryField] ?? registryField;
}

export function extractLegacyColumnsForEntity(
  formData: FormData,
  locales: PublicLocale[],
  entityType: string,
  registryField: string
): Record<string, string> {
  const legacyField = resolveLegacyFieldName(entityType, registryField);
  return extractLegacyColumns(formData, locales, legacyField);
}

/** Omit *Ar legacy columns from admin save payloads when dual-write is disabled. */
export function applyLegacyWritePolicy<T extends Record<string, unknown>>(data: T): T {
  if (shouldWriteLegacyColumns()) return data;
  const next = { ...data };
  for (const key of Object.keys(next)) {
    if (key.endsWith("Ar")) {
      delete next[key];
    }
  }
  return next;
}
