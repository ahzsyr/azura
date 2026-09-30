import type { PublicLocale } from "@/i18n/locale-config";
import { FALLBACK_LOCALES, resolvePrefixToCode } from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import type { EntityTranslation } from "@prisma/client";

export type TranslationContext = {
  translations?: EntityTranslation[];
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
  /** When true, include DRAFT and REVIEW rows (admin preview). */
  includeUnpublished?: boolean;
};

const PUBLISHED_STATUSES = new Set(["PUBLISHED"]);

function isReadable(row: EntityTranslation, includeUnpublished?: boolean): boolean {
  if (!row.value.trim()) return false;
  if (includeUnpublished) return true;
  return PUBLISHED_STATUSES.has(row.status);
}

/**
 * Unified content translation resolver (translation-only).
 * Priority: EntityTranslation (PUBLISHED) → locale fallback chain → empty string.
 */
export function resolveTranslation(
  field: string,
  localeCode: string,
  ctx: TranslationContext = {}
): string {
  const enabled = ctx.enabledLocales ?? FALLBACK_LOCALES;
  const defaultCode = ctx.defaultCode ?? enabled.find((l) => l.isDefault)?.code ?? "en";
  const normalized = localeCode.toLowerCase();

  const dbMap: Record<string, string> = {};
  if (ctx.translations) {
    for (const row of ctx.translations) {
      if (row.field === field && isReadable(row, ctx.includeUnpublished)) {
        dbMap[row.localeCode.toLowerCase()] = row.value;
      }
    }
  }

  if (dbMap[normalized]) return dbMap[normalized];

  for (const candidate of resolveLocaleCandidates(normalized, enabled, defaultCode)) {
    if (candidate === normalized) continue;
    if (dbMap[candidate]) return dbMap[candidate];
  }

  return "";
}

/**
 * Resolve for the requested locale, then explicitly try default locale when still empty.
 */
export function resolveWithEnglishFallback(
  field: string,
  localeCode: string,
  ctx: TranslationContext = {}
): string {
  const value = resolveTranslation(field, localeCode, ctx);
  if (value.trim()) return value;
  const defaultCode = ctx.defaultCode ?? ctx.enabledLocales?.find((l) => l.isDefault)?.code ?? "en";
  if (localeCode.toLowerCase() === defaultCode.toLowerCase()) return value;
  return resolveTranslation(field, defaultCode, ctx);
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
    map.get(row.field)![row.localeCode.toLowerCase()] = row.value;
  }
  return map;
}

export function resolveLocalizedRecord(
  record: Record<string, string> | undefined,
  localeCode: string,
  enabledLocales: PublicLocale[],
  defaultCode?: string
): string {
  if (!record) return "";
  const fallback =
    defaultCode ?? enabledLocales.find((l) => l.isDefault)?.code ?? "en";
  for (const candidate of resolveLocaleCandidates(localeCode, enabledLocales, fallback)) {
    const value = record[candidate] ?? record[candidate.toLowerCase()];
    if (typeof value === "string" && value.trim()) return value;
  }
  const base = record[fallback] ?? record[fallback.toLowerCase()];
  if (typeof base === "string" && base.trim()) return base;
  return "";
}

export function toLocalizedRecord(
  translations: EntityTranslation[],
  field: string
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const row of translations) {
    if (row.field === field) {
      record[row.localeCode] = row.value;
    }
  }
  return record;
}

/** Log missing translation at runtime (dev/admin diagnostics). */
export function logMissingTranslation(
  entityType: string,
  entityId: string,
  field: string,
  localeCode: string
): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[MissingTranslation] ${entityType}.${field} entityId=${entityId} locale=${localeCode}`
  );
}

/** Resolve canonical field names for the default locale from EntityTranslation rows. */
export function resolveCanonicalFields(
  fields: string[],
  ctx: TranslationContext = {}
): Record<string, string> {
  const enabled = ctx.enabledLocales ?? FALLBACK_LOCALES;
  const defaultCode = ctx.defaultCode ?? enabled.find((l) => l.isDefault)?.code ?? "en";
  const out: Record<string, string> = {};
  for (const field of fields) {
    out[field] = resolveTranslation(field, defaultCode, ctx);
  }
  return out;
}
