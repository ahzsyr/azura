import { pickLocaleField } from "@/features/builder/blocks/content/lib/locale-field";
import { getLocalizedField, type LocalizedFieldOptions } from "@/lib/utils";
import type { CompareFieldMeta, CompareItemSnapshot, ComparableTypeMeta } from "@/features/comparison/types";

export type CompareLocaleOptions = LocalizedFieldOptions;

const BOOLEAN_LABELS = {
  yesEn: "Yes",
  yesAr: "نعم",
  noEn: "No",
  noAr: "لا",
} as const;

const COMPARE_ACTION_LABELS = {
  labelEn: "Compare",
  labelAr: "قارن",
} as const;

export function compareItemTitle(
  item: CompareItemSnapshot,
  localePrefix: string,
  options?: CompareLocaleOptions
): string {
  const record = item as unknown as Record<string, unknown>;
  const fromCanonical = getLocalizedField(record, "title", localePrefix, {
    ...options,
    translations: item.translations ?? options?.translations,
  });
  if (fromCanonical.trim()) return fromCanonical;
  return pickLocaleField(record, "title", localePrefix, options);
}

export function compareTypePluralLabel(
  meta: Pick<ComparableTypeMeta, "labelPluralEn" | "labelPluralAr"> | null | undefined,
  localePrefix: string,
  fallback: string,
  options?: CompareLocaleOptions
): string {
  if (!meta) return fallback;
  return (
    pickLocaleField(meta as Record<string, unknown>, "labelPlural", localePrefix, options) ||
    fallback
  );
}

export function compareFieldLabel(
  meta: CompareFieldMeta,
  localePrefix: string,
  options?: CompareLocaleOptions
): string {
  return pickLocaleField(meta as Record<string, unknown>, "label", localePrefix, options);
}

export function compareBooleanLabel(
  value: boolean,
  localePrefix: string,
  options?: CompareLocaleOptions
): string {
  const key = value ? "yes" : "no";
  return pickLocaleField(BOOLEAN_LABELS, key, localePrefix, options);
}

export function compareSelectOptionLabel(
  opt: Record<string, unknown>,
  localePrefix: string,
  options?: CompareLocaleOptions
): string {
  return pickLocaleField(opt, "label", localePrefix, options);
}

const COMPARE_ADD_LABELS = {
  labelEn: "Add to Compare",
  labelAr: "أضف للمقارنة",
} as const;

export function compareActionLabel(localePrefix: string, options?: CompareLocaleOptions): string {
  return pickLocaleField(COMPARE_ACTION_LABELS, "label", localePrefix, options);
}

export function compareAddLabel(localePrefix: string, options?: CompareLocaleOptions): string {
  return pickLocaleField(COMPARE_ADD_LABELS, "label", localePrefix, options);
}

export function compareSpecificationsLabel(
  localePrefix: string,
  options?: CompareLocaleOptions
): string {
  return pickLocaleField(
    { labelEn: "Specifications", labelAr: "المواصفات" },
    "label",
    localePrefix,
    options
  );
}

export function compareDefaultTitle(
  localePrefix: string,
  options?: CompareLocaleOptions
): string {
  return pickLocaleField(
    { titleEn: "Comparison", titleAr: "المقارنة" },
    "title",
    localePrefix,
    options
  );
}
