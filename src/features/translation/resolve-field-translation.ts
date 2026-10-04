/**
 * Canonical admin vs public field translation contract.
 * Admin: exact locale only (empty on miss).
 * Public: resolveLocaleCandidates chain.
 *
 * Keep this module free of server-only imports so unit tests can load it.
 */
import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import { resolveTranslation } from "@/features/translation/translation-resolver";

export type ResolveFieldTranslationParams = {
  field: string;
  requestedLocale: string;
  isAdmin: boolean;
  translations?: EntityTranslation[];
  enabledLocales: PublicLocale[];
  defaultCode?: string;
  includeUnpublished?: boolean;
};

function exactValue(
  translations: EntityTranslation[],
  field: string,
  localeCode: string,
  includeUnpublished?: boolean,
): string | null {
  const normalized = localeCode.toLowerCase();
  for (const row of translations) {
    if (row.field !== field) continue;
    if (row.localeCode.toLowerCase() !== normalized) continue;
    if (!row.value.trim()) continue;
    if (!includeUnpublished && row.status !== "PUBLISHED") continue;
    return row.value;
  }
  return null;
}

/**
 * Resolve a content field for admin (exact) or public (fallback chain).
 */
export function resolveFieldTranslation(params: ResolveFieldTranslationParams): string | null {
  const {
    field,
    requestedLocale,
    isAdmin,
    translations = [],
    enabledLocales,
    defaultCode,
    includeUnpublished,
  } = params;
  const normalized = requestedLocale.toLowerCase();

  if (isAdmin) {
    return exactValue(translations, field, normalized, includeUnpublished ?? true);
  }

  const resolved = resolveTranslation(field, normalized, {
    translations,
    enabledLocales,
    defaultCode,
    includeUnpublished,
  });
  return resolved.trim() ? resolved : null;
}

/** Resolve a slug map through the public candidate chain (or exact for admin). */
export function resolveSlugWithLocaleContract(params: {
  slugs: Record<string, string>;
  requestedLocale: string;
  enabledLocales: PublicLocale[];
  defaultCode?: string;
  isAdmin: boolean;
  fallbackSlug?: string;
}): string {
  const { slugs, requestedLocale, enabledLocales, defaultCode, isAdmin, fallbackSlug } = params;
  const normalized = requestedLocale.toLowerCase();

  if (isAdmin) {
    return slugs[normalized] ?? fallbackSlug ?? "";
  }

  for (const candidate of resolveLocaleCandidates(normalized, enabledLocales, defaultCode)) {
    if (slugs[candidate]) return slugs[candidate];
  }
  return fallbackSlug ?? "";
}
