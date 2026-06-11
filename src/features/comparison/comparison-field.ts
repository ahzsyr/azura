import type { ContentFieldDefinition } from "@/features/content/types";
import type { CompareFieldMeta, ComparisonAttribute } from "@/features/comparison/types";

/** Schema-driven comparison field (alias CompareFieldMeta for framework API). */
export type ComparisonField = CompareFieldMeta;

export function toComparisonField(meta: CompareFieldMeta): ComparisonField {
  return meta;
}

export function comparisonFieldFromDefinition(
  field: ContentFieldDefinition,
  index: number,
  locale: string
): ComparisonField | null {
  if (field.compare !== true) return null;
  const label =
    locale.startsWith("ar") && (field.compareLabelAr ?? field.labelAr)
      ? (field.compareLabelAr ?? field.labelAr)!
      : (field.compareLabelEn ?? field.labelEn);
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
  locale: string
): ComparisonAttribute[] {
  const attrs: ComparisonAttribute[] = [];
  for (const meta of fields) {
    const raw = readFieldValue(item.attributes, meta.field, locale);
    if (raw == null) continue;
    const value = formatAttributeValue(raw, meta.field, locale, item.attributes);
    if (value === null) continue;
    attrs.push({
      id: `${item.id}:${meta.key}`,
      key: meta.key,
      label:
        locale.startsWith("ar") && meta.labelAr ? meta.labelAr : meta.labelEn,
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
  locale: string
): unknown {
  if (field.localized) {
    const suffix = locale.startsWith("ar") ? "Ar" : "En";
    const localized = attributes[`${field.key}${suffix}`];
    if (localized != null && String(localized).trim() !== "") return localized;
    return attributes[`${field.key}En`] ?? attributes[`${field.key}Ar`];
  }
  return attributes[field.key];
}

function formatAttributeValue(
  value: unknown,
  field: ContentFieldDefinition,
  locale: string,
  attributes: Record<string, unknown>
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
    if (opt) return locale.startsWith("ar") && opt.labelAr ? opt.labelAr : opt.labelEn;
  }
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}
