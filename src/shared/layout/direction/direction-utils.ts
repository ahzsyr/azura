import { isArabicLocale } from "./direction-resolver";
import type { LayoutDirection } from "./direction-types";

export function isRTL(dir: LayoutDirection): boolean {
  return dir === "rtl";
}

export function isLTR(dir: LayoutDirection): boolean {
  return dir === "ltr";
}

export function getNumberLocale(locale: string): string {
  return isArabicLocale(locale) ? "ar-AE" : "en-US";
}

export function getShortLanguageLocale(locale: string): "ar" | "en" {
  return isArabicLocale(locale) ? "ar" : "en";
}

