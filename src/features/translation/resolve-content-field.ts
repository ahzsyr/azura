import type { EntityTranslation } from "@prisma/client";
import {
  FALLBACK_LOCALES,
  getContentFieldSuffix,
  resolvePrefixToCode,
  type PublicLocale,
} from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import { resolveLocalizedRecord, resolveTranslation } from "@/features/translation/translation-resolver";
import type { LocalizedValueMap } from "@/features/translation/types";

export type ResolveContentFieldOptions = {
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
  translations?: EntityTranslation[];
  legacyFallback?: string;
  includeLegacySuffixFields?: boolean;
};

function readLegacySuffixedField(
  props: Record<string, unknown>,
  base: string,
  localeCode: string,
  enabled: PublicLocale[],
  defaultCode: string,
): string {
  const tryLocale = (code: string): string => {
    const suffix = getContentFieldSuffix(code);
    const camelKey = `${base}${suffix}`;
    const camelValue = props[camelKey];
    if (typeof camelValue === "string" && camelValue.trim()) return camelValue;
    const modernKey = `${base}_${code.toLowerCase()}`;
    const modernValue = props[modernKey];
    if (typeof modernValue === "string" && modernValue.trim()) return modernValue;
    return "";
  };

  const direct = tryLocale(localeCode);
  if (direct) return direct;

  for (const candidate of resolveLocaleCandidates(localeCode, enabled, defaultCode)) {
    const normalized = candidate.toLowerCase();
    if (normalized === localeCode.toLowerCase()) continue;
    const legacy = tryLocale(candidate);
    if (legacy) return legacy;
  }
  return "";
}

export function resolveContentField(
  item: Record<string, unknown>,
  field: string,
  localeInput: string,
  options: ResolveContentFieldOptions = {},
): string {
  const enabled = options.enabledLocales ?? FALLBACK_LOCALES;
  const defaultCode = options.defaultCode ?? enabled.find((locale) => locale.isDefault)?.code ?? "en";
  const localeCode = resolvePrefixToCode(localeInput, enabled);

  if (options.translations?.length) {
    const fromTranslations = resolveTranslation(field, localeCode, {
      translations: options.translations,
      enabledLocales: enabled,
      defaultCode,
    });
    if (fromTranslations.trim()) return fromTranslations;
  }

  const localizedMapValue = item[field];
  if (localizedMapValue && typeof localizedMapValue === "object" && !Array.isArray(localizedMapValue)) {
    const resolved = resolveLocalizedRecord(
      localizedMapValue as LocalizedValueMap,
      localeCode,
      enabled,
      defaultCode,
    );
    if (resolved.trim()) return resolved;
  }

  if (options.includeLegacySuffixFields) {
    const legacy = readLegacySuffixedField(item, field, localeCode, enabled, defaultCode);
    if (legacy.trim()) return legacy;
  }

  const baseValue = item[field];
  if (typeof baseValue === "string" && baseValue.trim()) return baseValue;

  return options.legacyFallback?.trim() ?? "";
}

