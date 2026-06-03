import type { PublicLocale } from "@/i18n/locale-config";
import { FALLBACK_LOCALES, resolvePrefixToCode } from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import type { EntityTranslation } from "@prisma/client";
import { readLegacyFieldWithFallback } from "./legacy-adapter";
import { shouldReadEntityTranslations, shouldReadLegacyColumns } from "./i18n-flags";

export type TranslationContext = {
  translations?: EntityTranslation[];
  legacyEntity?: Record<string, unknown>;
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
};

/**
 * Unified content translation resolver.
 * Priority: translation table → legacy columns → fallback chain → empty string.
 */
export function resolveTranslation(
  field: string,
  languageCode: string,
  ctx: TranslationContext = {}
): string {
  const enabled = ctx.enabledLocales ?? FALLBACK_LOCALES;
  const defaultCode = ctx.defaultCode ?? enabled.find((l) => l.isDefault)?.code ?? "en";
  const normalized = languageCode.toLowerCase();

  const dbMap: Record<string, string> = {};
  if (shouldReadEntityTranslations() && ctx.translations) {
    for (const row of ctx.translations) {
      if (row.field === field && row.status === "PUBLISHED" && row.value.trim()) {
        dbMap[row.languageCode.toLowerCase()] = row.value;
      }
    }
  }

  for (const candidate of resolveLocaleCandidates(normalized, enabled, defaultCode)) {
    if (dbMap[candidate]) return dbMap[candidate];
  }

  if (shouldReadLegacyColumns() && ctx.legacyEntity) {
    return readLegacyFieldWithFallback(
      ctx.legacyEntity,
      field,
      normalized,
      enabled,
      defaultCode
    );
  }

  return "";
}

/**
 * Resolve for the requested locale, then explicitly try English when still empty.
 */
export function resolveWithEnglishFallback(
  field: string,
  languageCode: string,
  ctx: TranslationContext = {}
): string {
  const value = resolveTranslation(field, languageCode, ctx);
  if (value.trim()) return value;
  if (languageCode.toLowerCase() === "en") return value;
  return resolveTranslation(field, "en", ctx);
}

export function resolveTranslationFromPrefix(
  field: string,
  urlPrefix: string,
  ctx: TranslationContext = {}
): string {
  const enabled = ctx.enabledLocales ?? FALLBACK_LOCALES;
  const code = resolvePrefixToCode(urlPrefix, enabled);
  return resolveTranslation(field, code, ctx);
}

export function buildTranslationMap(
  translations: EntityTranslation[]
): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const row of translations) {
    if (!map.has(row.field)) map.set(row.field, {});
    map.get(row.field)![row.languageCode.toLowerCase()] = row.value;
  }
  return map;
}

export function resolveLocalizedRecord(
  record: Record<string, string> | undefined,
  languageCode: string,
  enabledLocales: PublicLocale[],
  defaultCode?: string
): string {
  if (!record) return "";
  for (const candidate of resolveLocaleCandidates(languageCode, enabledLocales, defaultCode)) {
    const value = record[candidate] ?? record[candidate.toLowerCase()];
    if (typeof value === "string" && value.trim()) return value;
  }
  return record.en ?? Object.values(record)[0] ?? "";
}

export function toLocalizedRecord(
  translations: EntityTranslation[],
  field: string
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const row of translations) {
    if (row.field === field) {
      record[row.languageCode] = row.value;
    }
  }
  return record;
}
