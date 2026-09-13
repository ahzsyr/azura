import type { PublicLocale } from "@/i18n/locale-config";
import { localeService } from "@/features/i18n/locale.service";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";

export type LocaleFormatConfig = {
  dateLocale: string;
  numberLocale: string;
  currency: string;
  dir: "ltr" | "rtl";
};

const FALLBACK_FORMAT: LocaleFormatConfig = {
  dateLocale: "en-US",
  numberLocale: "en-US",
  currency: "USD",
  dir: "ltr",
};

async function getLocaleRow(code: string): Promise<LocaleFormatConfig> {
  try {
    const rows = await localeService.listAll();
    const match = rows.find((r) => r.code.toLowerCase() === code.toLowerCase());
    if (match) {
      return {
        dateLocale: match.dateLocale,
        numberLocale: match.numberLocale,
        currency: match.currency,
        dir: match.dir === "rtl" ? "rtl" : "ltr",
      };
    }
  } catch {
    // fall through
  }
  return FALLBACK_FORMAT;
}

export async function getFormatConfigForCode(code: string): Promise<LocaleFormatConfig> {
  const enabled = await localeService.listEnabled();
  for (const candidate of resolveLocaleCandidates(code, enabled)) {
    const config = await getLocaleRow(candidate);
    if (config !== FALLBACK_FORMAT || candidate === code.toLowerCase()) {
      return config;
    }
  }
  return FALLBACK_FORMAT;
}

export async function formatCurrency(
  amount: number | string,
  localeCode: string,
  currencyOverride?: string
): Promise<string> {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const config = await getFormatConfigForCode(localeCode);
  return new Intl.NumberFormat(config.numberLocale, {
    style: "currency",
    currency: currencyOverride ?? config.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencySync(
  amount: number | string,
  localeCode: string,
  numberLocale = "en-US",
  currency = "USD"
): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export async function formatDate(
  date: Date | string | number,
  localeCode: string,
  options?: Intl.DateTimeFormatOptions
): Promise<string> {
  const config = await getFormatConfigForCode(localeCode);
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(config.dateLocale, options).format(d);
}

export async function formatNumber(
  value: number,
  localeCode: string,
  options?: Intl.NumberFormatOptions
): Promise<string> {
  const config = await getFormatConfigForCode(localeCode);
  return new Intl.NumberFormat(config.numberLocale, options).format(value);
}

export function interpolate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : `{{${key}}}`
  );
}

export function pluralize(
  localeCode: string,
  forms: { zero?: string; one: string; other: string },
  count: number
): string {
  const rules = new Intl.PluralRules(localeCode);
  const category = rules.select(count);
  if (category === "one") return forms.one;
  if (category === "zero" && forms.zero) return forms.zero;
  return forms.other;
}
