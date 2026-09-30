import { getContentFieldSuffix } from "@/i18n/locale-config";

/** Keys that store translatable copy on HtmlElement or attributes. */
export const LOCALIZED_BASE_KEYS = [
  "text",
  "title",
  "rawHtml",
  "alt",
  "ariaLabel",
  "caption",
] as const;

export type LocalizedBaseKey = (typeof LOCALIZED_BASE_KEYS)[number];

export function localizedFieldKey(baseKey: string, localeCode: string): string {
  return `${baseKey}${getContentFieldSuffix(localeCode)}`;
}

function isSuffixedKey(key: string, baseKey: string): boolean {
  if (!key.startsWith(baseKey) || key.length <= baseKey.length) return false;
  return /^[A-Z]/.test(key.slice(baseKey.length));
}

/**
 * Read a localized field with fallback to the unsuffixed base value.
 * Used at render/serialize time.
 */
export function readLocalizedField(
  record: Record<string, unknown> | undefined | null,
  baseKey: string,
  localeCode: string
): string {
  if (!record) return "";
  const localized = record[localizedFieldKey(baseKey, localeCode)];
  if (typeof localized === "string" && localized.trim()) return localized;
  const base = record[baseKey];
  return typeof base === "string" ? base : "";
}

/**
 * Read a localized field for admin editing.
 * Non-default locales return only the locale-specific value (empty means "use default on site").
 */
export function readLocalizedFieldForEdit(
  record: Record<string, unknown> | undefined | null,
  baseKey: string,
  localeCode: string,
  defaultCode: string
): string {
  if (!record) return "";
  const localized = record[localizedFieldKey(baseKey, localeCode)];
  if (typeof localized === "string") return localized;
  if (localeCode === defaultCode) {
    const base = record[baseKey];
    if (typeof base === "string") return base;
  }
  return "";
}

/**
 * Dual-write the unsuffixed base key when editing the default locale,
 * matching existing Custom HTML text forms (text + textEn).
 */
export function patchLocalizedField(
  baseKey: string,
  value: string,
  localeCode: string,
  defaultCode: string
): Record<string, string> {
  const key = localizedFieldKey(baseKey, localeCode);
  if (localeCode === defaultCode) {
    return { [baseKey]: value, [key]: value };
  }
  return { [key]: value };
}

/** Copy suffixed fields from one base key to another (e.g. labelEn → textEn). */
export function copyPrefixedFields(
  source: Record<string, unknown> | undefined | null,
  fromBase: string,
  toBase: string
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!source) return out;
  for (const [k, v] of Object.entries(source)) {
    if (typeof v !== "string") continue;
    if (k === fromBase) {
      out[toBase] = v;
    } else if (isSuffixedKey(k, fromBase)) {
      out[`${toBase}${k.slice(fromBase.length)}`] = v;
    }
  }
  return out;
}

/** Collect all locale-suffixed keys for the given base keys (excludes unsuffixed bases). */
export function pickSuffixedFields(
  record: Record<string, unknown> | undefined | null,
  baseKeys: readonly string[] = LOCALIZED_BASE_KEYS
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!record) return out;
  for (const [k, v] of Object.entries(record)) {
    if (baseKeys.some((base) => isSuffixedKey(k, base))) {
      out[k] = v;
    }
  }
  return out;
}

/** Suffixed keys that do not belong to `localeCode` (preserve sibling translations). */
export function pickOtherLocaleFields(
  record: Record<string, unknown> | undefined | null,
  localeCode: string,
  baseKeys: readonly string[] = LOCALIZED_BASE_KEYS
): Record<string, unknown> {
  const currentKeys = new Set(baseKeys.map((base) => localizedFieldKey(base, localeCode)));
  const out: Record<string, unknown> = {};
  if (!record) return out;
  for (const [k, v] of Object.entries(record)) {
    if (currentKeys.has(k)) continue;
    if (baseKeys.some((base) => isSuffixedKey(k, base))) {
      out[k] = v;
    }
  }
  return out;
}

export const __test__ = {
  localizedFieldKey,
  readLocalizedField,
  readLocalizedFieldForEdit,
  patchLocalizedField,
  copyPrefixedFields,
  pickSuffixedFields,
  pickOtherLocaleFields,
  isSuffixedKey,
};
