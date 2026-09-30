import type { ContentFieldDefinition } from "@/features/content/types";
import { FALLBACK_LOCALES, getContentFieldSuffix, resolvePrefixToCode } from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import {
  compareFieldLabel,
  compareSelectOptionLabel,
  type CompareLocaleOptions,
} from "@/features/comparison/lib/compare-locale";
import type { CompareFieldMeta, ComparisonAttribute } from "@/features/comparison/types";

/** Schema-driven comparison field (alias CompareFieldMeta for framework API). */
export type ComparisonField = CompareFieldMeta;

export function toComparisonField(meta: CompareFieldMeta): ComparisonField {
  return meta;
}

export function comparisonFieldFromDefinition(
  field: ContentFieldDefinition,
  index: number,
  localePrefix: string,
  options?: CompareLocaleOptions
): ComparisonField | null {
  if (field.compare !== true) return null;
  return {
    key: field.key,
    field,
    labelEn: field.compareLabelEn ?? field.labelEn,
    labelAr: field.compareLabelAr ?? field.labelAr,
    compareOrder: field.compareOrder ?? index * 10,
    compareGroup: field.compareGroup ?? field.group ?? "General",
    highlightDifferences: field.highlightDifferences !== false,
  };
}

export function buildComparisonAttributes(
  item: { id: string; attributes: Record<string, unknown> },
  fields: ComparisonField[],
  localePrefix: string,
  options?: CompareLocaleOptions
): ComparisonAttribute[] {
  const attrs: ComparisonAttribute[] = [];
  for (const meta of fields) {
    const raw = readFieldValue(item.attributes, meta.field, localePrefix, options);
    if (raw == null) continue;
    const value = formatAttributeValue(raw, meta.field, localePrefix, item.attributes, options);
    if (value === null) continue;
    attrs.push({
      id: `${item.id}:${meta.key}`,
      key: meta.key,
      label: compareFieldLabel(meta, localePrefix, options),
      value,
      category: meta.compareGroup,
      highlight: meta.highlightDifferences,
    });
  }
  return attrs;
}

function readFieldValue(
  attributes: Record<string, unknown>,
  field: ContentFieldDefinition,
  localePrefix: string,
  options?: CompareLocaleOptions
): unknown {
  if (field.localized) {
    const enabled = options?.enabledLocales ?? FALLBACK_LOCALES;
    const defaultCode =
      options?.defaultCode ?? enabled.find((l) => l.isDefault)?.code ?? "en";
    const code = resolvePrefixToCode(localePrefix, enabled);
    for (const candidate of resolveLocaleCandidates(code, enabled, defaultCode)) {
      const suffix = getContentFieldSuffix(candidate);
      const localized = attributes[`${field.key}${suffix}`];
      if (localized != null && String(localized).trim() !== "") return localized;
    }
    return attributes[`${field.key}En`] ?? attributes[`${field.key}Ar`];
  }
  return attributes[field.key];
}

function formatAttributeValue(
  value: unknown,
  field: ContentFieldDefinition,
  localePrefix: string,
  attributes: Record<string, unknown>,
  options?: CompareLocaleOptions
): string | number | boolean | null {
  if (value == null) return null;
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (field.type === "price") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (field.type === "select" && field.options?.length) {
    const str = String(value);
    const opt = field.options.find((o) => o.value === str);
    if (opt) {
      const label = compareSelectOptionLabel(opt as Record<string, unknown>, localePrefix, options);
      return label || null;
    }
  }
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}
