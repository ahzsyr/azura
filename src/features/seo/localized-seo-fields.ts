import type { EntityTranslation } from "@prisma/client";
import {
  resolveWithEnglishFallback,
  type TranslationContext,
} from "@/features/translation/translation-resolver";

/** Parse JSON-LD stored as an EntityTranslation string; invalid JSON yields null. */
export function parseJsonLdTranslation(value: string | null | undefined): unknown | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Exact-locale EntityTranslation value with no fallback chain (PUBLISHED only). */
function readExactLocaleTranslation(
  field: string,
  localeCode: string,
  translations: EntityTranslation[] | undefined,
): string {
  if (!translations?.length) return "";
  const normalized = localeCode.toLowerCase();
  for (const row of translations) {
    if (
      row.field === field &&
      row.localeCode.toLowerCase() === normalized &&
      row.status === "PUBLISHED" &&
      row.value.trim()
    ) {
      return row.value;
    }
  }
  return "";
}

/**
 * Resolve per-locale focus keywords / JSON-LD / canonical URL from EntityTranslation,
 * falling back to English then SeoMeta column values.
 * Canonical URL uses exact-locale only (no English/locale-chain fallback).
 */
export function resolveLocalizedSeoExtras(
  languageCode: string,
  ctx: TranslationContext,
  meta: {
    focusKeywords?: string | null;
    jsonLd?: unknown;
    canonicalUrl?: string | null;
  },
): { focusKeywords: string | null; jsonLd: unknown; canonicalUrl: string | null } {
  const focusKeywordsFromTranslation = resolveWithEnglishFallback(
    "focusKeywords",
    languageCode,
    ctx,
  );
  const jsonLdFromTranslation = parseJsonLdTranslation(
    resolveWithEnglishFallback("jsonLd", languageCode, ctx),
  );
  const canonicalFromTranslation = readExactLocaleTranslation(
    "canonicalUrl",
    languageCode,
    ctx.translations,
  );

  return {
    focusKeywords: focusKeywordsFromTranslation.trim()
      ? focusKeywordsFromTranslation
      : (meta.focusKeywords ?? null),
    jsonLd: jsonLdFromTranslation ?? meta.jsonLd ?? null,
    canonicalUrl: canonicalFromTranslation.trim()
      ? canonicalFromTranslation.trim()
      : (meta.canonicalUrl ?? null),
  };
}
