import { getContentFieldSuffix } from "@/i18n/locale-config";
import type { HtmlElement, HtmlElementAttributes } from "../types";
import {
  localizedFieldKey,
  pickOtherLocaleFields,
} from "./localized-fields";

const ATTR_LOCALE_KEYS = ["alt", "title", "ariaLabel", "caption"] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function mergeAttributes(
  prev: HtmlElementAttributes | undefined,
  next: HtmlElementAttributes | undefined,
  localeCode: string,
  isDefault: boolean
): HtmlElementAttributes | undefined {
  const prevRec = asRecord(prev);
  const nextRec = asRecord(next);

  if (isDefault) {
    const preserved = pickOtherLocaleFields(prevRec, localeCode, ATTR_LOCALE_KEYS);
    const merged = { ...nextRec, ...preserved } as HtmlElementAttributes;
    return Object.keys(merged).length ? merged : undefined;
  }

  const patch: Record<string, unknown> = { ...prevRec };
  for (const base of ATTR_LOCALE_KEYS) {
    const parsed = nextRec[base];
    if (typeof parsed === "string") {
      patch[localizedFieldKey(base, localeCode)] = parsed;
    }
  }
  return Object.keys(patch).length ? (patch as HtmlElementAttributes) : prev;
}

function applyNonDefaultFields(parsed: HtmlElement, localeCode: string): Record<string, unknown> {
  const suffix = getContentFieldSuffix(localeCode);
  const patch: Record<string, unknown> = {};
  if (typeof parsed.text === "string") patch[`text${suffix}`] = parsed.text;
  if (typeof parsed.rawHtml === "string") patch[`rawHtml${suffix}`] = parsed.rawHtml;
  const title = parsed["title"];
  if (typeof title === "string") patch[`title${suffix}`] = title;
  return patch;
}

function mergeElement(
  prev: HtmlElement,
  next: HtmlElement,
  localeCode: string,
  isDefault: boolean
): HtmlElement {
  if (prev.tag !== next.tag) {
    if (isDefault) {
      return {
        ...next,
        ...pickOtherLocaleFields(asRecord(prev), localeCode),
        hidden: prev.hidden,
      };
    }
    return prev;
  }

  if (isDefault) {
    const preserved = pickOtherLocaleFields(asRecord(prev), localeCode);
    const defaultSuffixPatch: Record<string, string> = {};
    if (typeof next.text === "string") {
      defaultSuffixPatch[localizedFieldKey("text", localeCode)] = next.text;
    }
    if (typeof next.rawHtml === "string") {
      defaultSuffixPatch[localizedFieldKey("rawHtml", localeCode)] = next.rawHtml;
    }
    return {
      ...next,
      id: prev.id,
      hidden: prev.hidden,
      ...preserved,
      ...defaultSuffixPatch,
      attributes: mergeAttributes(prev.attributes, next.attributes, localeCode, true),
      children: mergeSourceElements(prev.children ?? [], next.children ?? [], localeCode, true),
    };
  }

  return {
    ...prev,
    ...applyNonDefaultFields(next, localeCode),
    attributes: mergeAttributes(prev.attributes, next.attributes, localeCode, false),
    children: mergeSourceElements(prev.children ?? [], next.children ?? [], localeCode, false),
  };
}

/**
 * Merge parsed source HTML back into the existing element tree without
 * destroying sibling locale translations.
 *
 * Default locale: parsed structure wins; other-locale keys are copied when tags match.
 * Other locales: structure is kept; only locale-suffixed text/attrs are updated.
 */
export function mergeSourceElements(
  existing: HtmlElement[],
  parsed: HtmlElement[],
  localeCode: string,
  isDefault: boolean
): HtmlElement[] {
  const parsedIsFallback =
    parsed.length === 1 &&
    parsed[0]?.rawHtml !== undefined &&
    existing.length > 0 &&
    existing.some((el) => el.rawHtml === undefined);

  if (parsedIsFallback && !isDefault) {
    return existing;
  }

  const len = Math.max(existing.length, parsed.length);
  const result: HtmlElement[] = [];

  for (let i = 0; i < len; i++) {
    const prev = existing[i];
    const next = parsed[i];
    if (!next) {
      result.push(prev!);
      continue;
    }
    if (!prev) {
      if (isDefault) {
        result.push(next);
      } else {
        result.push({ ...next, ...applyNonDefaultFields(next, localeCode) });
      }
      continue;
    }
    result.push(mergeElement(prev, next, localeCode, isDefault));
  }

  return result;
}

export const __test__ = { mergeSourceElements, mergeElement };
